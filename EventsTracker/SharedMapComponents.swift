import Foundation
import MapKit
import SwiftUI

// Define the distance for grouping locations
let feetToMeters: Double = 0.3048
let threeHundredFeetInMeters: Double = 300 * feetToMeters // 300 feet converted to meters

// Helper struct to hold grouped log location data for map annotations
/// Represents a cluster of log entries at a specific location.
struct GroupedLogLocation: Identifiable {
    let id = UUID() // Unique identifier for each grouped location
    let coordinate: CLLocationCoordinate2D // The coordinate of the grouped location
    var count: Int // The number of log entries at this grouped location
    let thingColor: ColorData // The color of the 'Thing' this log belongs to
    let thingName: String // Add thingName for the filter menu
}

/// Utilities for map clustering and region calculation.
struct MapHelpers {
    /// Groups log entries from multiple Things based on proximity and the Thing they belong to.
    /// - Parameter things: An array of `Thing` objects, which should contain the logs to be grouped.
    /// - Returns: An array of `GroupedLogLocation` ready for display on a map.
    static func groupLocations(from things: [Thing]) -> [GroupedLogLocation] {
        var groupedLocations: [GroupedLogLocation] = []

        for thing in things {
            for log in thing.logs {
                guard let locData = log.location else { continue }

                let newCLLocation = CLLocation(latitude: locData.latitude, longitude: locData.longitude)
                var foundGroup = false

                for i in 0..<groupedLocations.count {
                    // A group matches if it's for the same Thing (name and color)...
                    if groupedLocations[i].thingName == thing.name && groupedLocations[i].thingColor == thing.color {
                        let existingCLLocation = CLLocation(latitude: groupedLocations[i].coordinate.latitude, longitude: groupedLocations[i].coordinate.longitude)
                        // ...and the location is nearby.
                        if newCLLocation.distance(from: existingCLLocation) <= threeHundredFeetInMeters {
                            groupedLocations[i].count += 1
                            foundGroup = true
                            break // Found a group, no need to check further
                        }
                    }
                }

                if !foundGroup {
                    // No matching group found, create a new one
                    groupedLocations.append(GroupedLogLocation(coordinate: newCLLocation.coordinate, count: 1, thingColor: thing.color, thingName: thing.name))
                }
            }
        }
        return groupedLocations
    }

    /// Calculates an optimal `MapCameraPosition` to fit an array of locations.
    /// - Parameter locations: An array of `GroupedLogLocation` to be displayed.
    /// - Returns: A `MapCameraPosition` that encompasses all the locations.
    static func region(for locations: [GroupedLogLocation]) -> MapCameraPosition {
        guard !locations.isEmpty else {
            return .automatic
        }

        if locations.count == 1 {
            let coordinate = locations[0].coordinate
            let span = MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            return .region(MKCoordinateRegion(center: coordinate, span: span))
        }

        var minLat = locations[0].coordinate.latitude, maxLat = minLat
        var minLon = locations[0].coordinate.longitude, maxLon = minLon

        for loc in locations.dropFirst() {
            minLat = min(minLat, loc.coordinate.latitude)
            maxLat = max(maxLat, loc.coordinate.latitude)
            minLon = min(minLon, loc.coordinate.longitude)
            maxLon = max(maxLon, loc.coordinate.longitude)
        }

        let center = CLLocationCoordinate2D(latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2)
        let span = MKCoordinateSpan(latitudeDelta: (maxLat - minLat) * 1.4, longitudeDelta: (maxLon - minLon) * 1.4) // 40% buffer

        return .region(MKCoordinateRegion(center: center, span: span))
    }
}
