import SwiftUI
import MapKit
import CoreLocation

/// A map view displaying locations for a specific category (Thing).
struct CategoryMapView: View {
    @ObservedObject var store: DataStore // Reference to the shared DataStore
    var thing: Thing // The specific Thing (category) whose logs will be mapped
    @Environment(\.dismiss) var dismiss // Environment value to dismiss the view

    @State private var groupedLocations: [GroupedLogLocation] = [] // Stores the grouped location data
    @State private var region: MapCameraPosition = .automatic // Controls the map's camera position

    var body: some View {
        NavigationView {
            Map(position: $region) {
                // Iterate over the grouped locations to create map annotations
                ForEach(groupedLocations) { groupedLoc in
                    // Use Annotation for custom marker views
                    Annotation("", coordinate: groupedLoc.coordinate) {
                        ZStack {
                            Circle().fill(Color(groupedLoc.thingColor))
                                .frame(width: 40, height: 40) // Size of the circular marker
                                .overlay(
                                    Text("\(groupedLoc.count)") // Display the count
                                        .foregroundColor(.white)
                                        .font(.caption)
                                        .fontWeight(.bold)
                                )
                                .shadow(radius: 3) // Add a subtle shadow
                        }
                    }
                }
            }
            .navigationTitle("\(thing.name) Locations") // Title for the navigation bar
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss() // Dismiss the sheet
                    }
                }
            }
            .onAppear {
                // When the view appears, group the locations for the current thing
                groupedLocations = MapHelpers.groupLocations(from: [thing])
                // Automatically calculate and set the map region to fit all annotations.
                region = MapHelpers.region(for: groupedLocations)
            }
        }
    }
}
