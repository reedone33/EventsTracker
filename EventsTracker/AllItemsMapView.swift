import SwiftUI
import MapKit
import CoreLocation

/// A map view displaying locations for all tracked items, with filtering capabilities.
struct AllItemsMapView: View {
    @ObservedObject var store: DataStore
    @Environment(\.dismiss) var dismiss

    @State private var groupedAllLocations: [GroupedLogLocation] = []
    @State private var region: MapCameraPosition = .automatic

    // Filter states
    @State private var selectedThingIds: Set<UUID> = [] // IDs of things to display
    @State private var startDate: Date = Calendar.current.date(byAdding: .year, value: -1, to: Date()) ?? Date() // Default to 1 year ago
    @State private var endDate: Date = Date() // Default to today

    var body: some View {
        NavigationView {
            Map(position: $region) {
                ForEach(groupedAllLocations) { groupedLoc in
                    Annotation(groupedLoc.thingName, coordinate: groupedLoc.coordinate) {
                        ZStack {
                            Circle().fill(Color(groupedLoc.thingColor))
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Text("\(groupedLoc.count)")
                                        .foregroundColor(.white)
                                        .font(.caption)
                                        .fontWeight(.bold)
                                )
                                .shadow(radius: 3)
                        }
                    }
                }
            }
            .navigationTitle("All Tracked Locations")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        // Thing Filter
                        Text("Filter by Thing")
                        ForEach(store.things) { thing in
                            Toggle(isOn: Binding(
                                get: { selectedThingIds.contains(thing.id) },
                                set: { isOn in
                                    if isOn {
                                        selectedThingIds.insert(thing.id)
                                    } else {
                                        selectedThingIds.remove(thing.id)
                                    }
                                    applyFiltersAndGroupLocations()
                                }
                            )) {
                                Label(thing.name, systemImage: selectedThingIds.contains(thing.id) ? "checkmark.circle.fill" : "circle")
                                    .tint(Color(thing.color)) // Tint the label icon
                            }
                        }
                        
                        Divider() // Separator for date filters

                        // Date Range Filters
                        DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                            .onChange(of: startDate) {
                                applyFiltersAndGroupLocations()
                            }
                        DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                            .onChange(of: endDate) {
                                applyFiltersAndGroupLocations()
                            }
                    } label: {
                        Image(systemName: "line.horizontal.3.decrease.circle")
                    }
                }
            }
            .onAppear {
                // Initialize filters: select all things by default
                selectedThingIds = Set(store.things.map { $0.id })
                applyFiltersAndGroupLocations()
            }
            .onReceive(store.$things) { newThings in
                // Re-apply filters if things in store change (e.g., new thing added/deleted)
                // This ensures the filter menu and map update
                let newThingIds = Set(newThings.map { $0.id })
                selectedThingIds = selectedThingIds.intersection(newThingIds)
                if selectedThingIds.isEmpty && !newThingIds.isEmpty {
                    selectedThingIds = newThingIds
                }
                applyFiltersAndGroupLocations()
            }
        }
    }

    /// Applies filters (Thing selection and Date range) and groups locations for display.
    private func applyFiltersAndGroupLocations() {
        // 1. Filter by selected Thing IDs
        let thingsToShow = store.things.filter { selectedThingIds.contains($0.id) }
        
        // 2. Create new Thing models with logs filtered by the selected date range
        let calendar = Calendar.current
        // Adjust end date to include the entire day.
        guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: endDate)) else {
            groupedAllLocations = []
            return
        }

        let thingsWithFilteredLogs = thingsToShow.map { thing -> Thing in
            var mutableThing = thing
            mutableThing.logs = thing.logs.filter { $0.date >= startDate && $0.date < endOfDay }
            return mutableThing
        }

        // 3. Group the filtered logs using the shared helper
        groupedAllLocations = MapHelpers.groupLocations(from: thingsWithFilteredLogs)

        // Automatically calculate and set the map region to fit all annotations.
        region = MapHelpers.region(for: groupedAllLocations)
    }
}
