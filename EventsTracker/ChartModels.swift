import Foundation
import SwiftUI

// MARK: - Chart Data Models

/// Data point for frequency charts, representing a count of events on a specific date.
struct ChartDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let count: Int
    let thingName: String
    let color: ColorData
}

/// Data point for time-of-day charts, representing an event at a specific time.
struct TimeOfDayDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let hour: Double
    var count: Int
    let thingName: String
}

/// Enum representing the available chart types.
enum ChartType: String, CaseIterable, Identifiable {
    case frequency
    case timeOfDay
    var id: Self { self }

    var localizedName: LocalizedStringKey {
        switch self {
        case .frequency:
            return "Frequency"
        case .timeOfDay:
            return "Time of Day"
        }
    }
}

/// Enum representing the scale for time-of-day analysis.
enum TimeDetailScale: String, CaseIterable, Identifiable {
    case hourly
    case byMinute
    var id: Self { self }

    var localizedName: LocalizedStringKey {
        switch self {
        case .hourly:
            return "Hourly"
        case .byMinute:
            return "By Minute"
        }
    }
}

/// Enum representing the granularity for frequency analysis.
enum DateGranularity: String, CaseIterable, Identifiable {
    case day, month, year
    var id: Self { self }

    var component: Calendar.Component {
        switch self {
        case .day: return .day
        case .month: return .month
        case .year: return .year
        }
    }

    var localizedName: LocalizedStringKey {
        switch self {
        case .day: return "Daily"
        case .month: return "Monthly"
        case .year: return "Yearly"
        }
    }
}