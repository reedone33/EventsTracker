import SwiftUI
import CoreLocation

/// Represents a tracked entity or event type (e.g., "Coffee", "Workout").
struct Thing: Identifiable, Codable, Equatable {
    var id = UUID()
    var name: String
    var color: ColorData
    var logs: [LogEntry] = []
    var creationDate: Date?
}

/// Represents a single occurrence of an event.
struct LogEntry: Identifiable, Codable, Equatable {
    var id = UUID()
    var date: Date
    var location: LocationData?
    var note: String?
}

/// A serializable representation of a color (RGB).
struct ColorData: Codable, Equatable {
    var red: Double
    var green: Double
    var blue: Double
}

/// A serializable representation of a geographic location.
struct LocationData: Codable, Equatable {
    var latitude: Double
    var longitude: Double
}
