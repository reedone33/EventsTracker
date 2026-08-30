import SwiftUI
import MapKit

extension UUID: Identifiable {
    public var id: UUID { self }
}

/// Options for sorting the list of Things.
enum SortOption: CaseIterable, Identifiable {
    case dateCreated, ascending, descending, manual

    var id: Self { self }

    var localizedName: LocalizedStringKey {
        switch self {
        case .dateCreated:
            return "Date Created"
        case .ascending:
            return "A-Z"
        case .descending:
            return "Z-A"
        case .manual:
            return "Manual"
        }
    }
}

// MARK: - Views
/// The main view of the application, displaying a grid of tracked "Things".
struct ContentView: View {
    @StateObject private var store = DataStore()
    @StateObject private var locationManager = LocationManager()
    @State private var showingAddThing = false
    @State private var isEditing = false
    @State private var tappedThingId: UUID? = nil
    @State private var showingAllItemsMap = false
    @State private var showingAnalytics = false // New state variable
    @State private var showingExportView = false
    @State private var selectedThingId: UUID?
    @State private var thingToDelete: Thing? = nil // For the confirmation alert
    @State private var searchText = ""
    @State private var sortOption: SortOption = .dateCreated
    @State private var editMode: EditMode = .inactive
    
    @AppStorage("colorSchemeSetting") private var colorSchemeSetting: String = "system"

    private var preferredColorScheme: ColorScheme? {
        switch colorSchemeSetting {
        case "light":
            return .light
        case "dark":
            return .dark
        default:
            return nil
        }
    }
    
    /// Filters the things based on the search text.
    private var filteredThings: [Thing] {
        let searchedThings = searchText.isEmpty ? store.things : store.things.filter { $0.name.localizedCaseInsensitiveContains(searchText) }

        switch sortOption {
        case .dateCreated:
            // Sort by creation date, newest first. nil dates are treated as oldest.
            return searchedThings.sorted { ($0.creationDate ?? .distantPast) > ($1.creationDate ?? .distantPast) }
        case .ascending:
            return searchedThings.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .descending:
            return searchedThings.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedDescending }
        case .manual:
            return searchedThings
        }
    }
    
    /// A view for the "Add Thing" button, styled as a grid item.
    private var addThingButton: some View {
        ZStack {
            // Background color with rounded corners
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.2)) // A subtle grey square
                .shadow(color: .black.opacity(0.1), radius: 5, x: 0, y: 2)

            // Dashed border to indicate it's a placeholder/button
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.secondary.opacity(0.4), style: StrokeStyle(lineWidth: 2, dash: [5]))

            // Content
            Image(systemName: "plus")
                .font(.largeTitle)
                .foregroundColor(.secondary)
        }
        .aspectRatio(1, contentMode: .fit) // Make it a square
        .contentShape(Rectangle())
        .onTapGesture {
            showingAddThing = true
        }
    }

    var body: some View {
        NavigationView {
            Group {
                if sortOption == .manual {
                    List {
                        if !searchText.isEmpty {
                            Section {
                                Text("Clear the search field to reorder items manually.")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Section(header: Text("Drag to reorder")) {
                            ForEach(filteredThings) { thing in
                                ThingListRow(
                                    thing: thing,
                                    isEditing: $isEditing,
                                    selectedThingId: $selectedThingId,
                                    thingToDelete: $thingToDelete,
                                    logEvent: logEvent
                                )
                            }
                            .onMove(perform: searchText.isEmpty ? moveThing : { _, _ in })
                            .disabled(!searchText.isEmpty)
                        }
                    }
                    .listStyle(.insetGrouped)
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            ForEach(filteredThings) { thing in
                                ThingGridItem(thing: thing, isEditing: $isEditing, tappedThingId: $tappedThingId, selectedThingId: $selectedThingId, thingToDelete: $thingToDelete, logEvent: logEvent)
                            }

                            // The "Add Thing" button always appears at the end of the grid.
                            addThingButton
                        }
                        .padding(16)
                    }
                }
            }
            .navigationTitle("Events Tracker")
            .environment(\.editMode, $editMode)
            .searchable(text: $searchText, prompt: "Search Things")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    HStack {
                        Button {
                            showingAllItemsMap = true
                        } label: {
                            Image(systemName: "map")
                        }
                        
                        // New Button for Analytics
                        Button {
                            showingAnalytics = true
                        } label: {
                            Image(systemName: "chart.bar.xaxis")
                        }
                        
                        // Button to show the ExportView
                        Button {
                            showingExportView = true
                        } label: {
                            Image(systemName: "square.and.arrow.up")
                        }
                        
                        // Menu for changing the color scheme
                        Menu {
                            Picker("Appearance", selection: $colorSchemeSetting) {
                                Text("System").tag("system")
                                Text("Light").tag("light")
                                Text("Dark").tag("dark")
                            }
                        } label: {
                            Image(systemName: "circle.righthalf.filled")
                        }
                        
                        // New Sort Menu
                        Menu {
                            Picker("Sort by", selection: $sortOption) {
                                ForEach(SortOption.allCases) { option in
                                    Text(option.localizedName).tag(option)
                                }
                            }
                        } label: {
                            Image(systemName: "arrow.up.arrow.down.circle")
                        }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if sortOption == .manual {
                        Button(editMode == .active ? "Done" : "Reorder") {
                            withAnimation {
                                let active = editMode == .active
                                isEditing = !active
                                editMode = active ? .inactive : .active
                            }
                        }
                    } else {
                        Button(isEditing ? "Done" : "Edit") {
                            withAnimation {
                                isEditing.toggle()
                                editMode = isEditing ? .active : .inactive
                            }
                        }
                    }
                }
            }
            .sheet(isPresented: $showingAddThing) {
                AddThingView(store: store)
            }
            .sheet(isPresented: $showingExportView) {
                ExportView(store: store)
            }
            .sheet(isPresented: $showingAllItemsMap) {
                AllItemsMapView(store: store)
            }
            // New sheet for the AnalyticsView
            .sheet(isPresented: $showingAnalytics) {
                AnalyticsView(store: store)
            }
            .sheet(item: $selectedThingId) { thingId in
                // Find the latest version of the thing from the store to pass to the detail view
                if let thing = store.things.first(where: { $0.id == thingId }) {
                    NavigationView {
                        ThingDetailView(store: store, thingId: thingId)
                    }
                }
            }
            .alert(item: $thingToDelete) { thing in
                Alert(
                    title: Text("Delete \"\(thing.name)\"?"),
                    message: Text("Are you sure you want to delete this item? This action cannot be undone."),
                    primaryButton: .destructive(Text("Delete")) {
                        deleteThing(thing: thing)
                    },
                    secondaryButton: .cancel()
                )
            }
        }
        .preferredColorScheme(preferredColorScheme)
    }
    
    private var selectedThing: Thing? {
        guard let selectedThingId = selectedThingId else { return nil }
        return store.things.first { $0.id == selectedThingId }
    }


    // MARK: - Private Methods

    /// Formats the date for the "Last Log" display.
    private func formatLastLogDate(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) {
            // Only show time if it was today
            return date.formatted(date: .omitted, time: .shortened)
        } else {
            // Show the date if it was not today
            return date.formatted(date: .numeric, time: .omitted)
        }
    }

    /// Creates a new log entry for the specified Thing with the current location.
    private func logEvent(for thing: Thing) {
        // Get the last known location from the manager
        let locationData: LocationData?
        if let location = locationManager.lastKnownLocation {
            locationData = LocationData(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
        } else {
            locationData = nil
        }
        
        let newLog = LogEntry(date: Date(), location: locationData, note: nil)
        if let index = store.things.firstIndex(where: { $0.id == thing.id }) {
            store.things[index].logs.append(newLog)
            store.save()
        }
    }
    
    /// Deletes a Thing from the store.
    private func deleteThing(thing: Thing) {
        withAnimation {
            store.things.removeAll { $0.id == thing.id }
            store.save()
        }
    }

    private func moveThing(from source: IndexSet, to destination: Int) {
        withAnimation {
            store.things.move(fromOffsets: source, toOffset: destination)
            store.save()
        }
    }
}

/// A row view used for manual reordering in the main list.
struct ThingListRow: View {
    let thing: Thing
    @Binding var isEditing: Bool
    @Binding var selectedThingId: UUID?
    @Binding var thingToDelete: Thing?
    let logEvent: (Thing) -> Void

    var body: some View {
        HStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(thing.color))
                .frame(width: 40, height: 40)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.secondary.opacity(0.4), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(thing.name)
                    .font(.headline)
                Text(thing.logs.isEmpty ? "No logs" : "Logs: \(thing.logs.count)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()

            if isEditing {
                Button(action: { thingToDelete = thing }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.red)
                }
                .buttonStyle(BorderlessButtonStyle())
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            guard !isEditing else { return }
            selectedThingId = thing.id
        }
        .onLongPressGesture(minimumDuration: 0.2) {
            guard !isEditing else { return }
            logEvent(thing)
        }
    }
}

/// A single grid item representing a "Thing" in the main view.
struct ThingGridItem: View {
    let thing: Thing
    @Binding var isEditing: Bool
    @Binding var tappedThingId: UUID?
    @Binding var selectedThingId: UUID?
    @Binding var thingToDelete: Thing?
    let logEvent: (Thing) -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Main content of the tile
            ZStack {
                // Background color with rounded corners
                RoundedRectangle(cornerRadius: 12).fill(Color(thing.color))
                    .shadow(color: .black.opacity(0.2), radius: 5, x: 0, y: 2)

                // Add a gradient overlay for better text contrast
                LinearGradient(
                    gradient: Gradient(colors: [.clear, .black.opacity(0.5)]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .cornerRadius(12)

                // Border
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.secondary.opacity(0.5), lineWidth: 2)

                // Content
                VStack {
                    Text(thing.name)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)

                    Spacer()

                    if thing.logs.isEmpty {
                        Text("—")
                            .font(.system(size: 50, weight: .bold, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    } else {
                        Text("\(thing.logs.count)")
                            .font(.system(size: 50, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }

                    Spacer()

                    if let lastLogDate = thing.logs.sorted(by: { $0.date > $1.date }).first?.date {
                        Text("Last: \(formatLastLogDate(lastLogDate))")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.9))
                    } else {
                        Text("Never tracked")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.9))
                    }
                }
                .multilineTextAlignment(.center)
                .padding(12)
            }
            .aspectRatio(1, contentMode: .fit) // Make it a square
            .scaleEffect(tappedThingId == thing.id ? 0.9 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.5), value: tappedThingId)
            .contentShape(Rectangle())
            .gesture(
                TapGesture()
                    .onEnded {
                        guard !isEditing else { return }
                        withAnimation(.spring(response: 0.2, dampingFraction: 0.5)) { tappedThingId = thing.id }
                        logEvent(thing)
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                            withAnimation(.spring(response: 0.2, dampingFraction: 0.5)) { tappedThingId = nil }
                        }
                    }
                    .exclusively(before: LongPressGesture().onEnded { _ in if !isEditing { selectedThingId = thing.id } })
            )

            if isEditing {
                Button(action: { thingToDelete = thing }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title)
                        .foregroundColor(.red)
                        .background(Color.white.clipShape(Circle()))
                }
                .offset(x: 10, y: -10)
            }
        }
    }

    private func formatLastLogDate(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) {
            return date.formatted(date: .omitted, time: .shortened)
        } else {
            return date.formatted(date: .numeric, time: .omitted)
        }
    }
}
