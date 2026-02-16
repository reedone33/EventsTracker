# EventsTracker Technical Specification

## 1. Overview
EventsTracker is an iOS application designed to allow users to track specific events or "Things" and analyze their occurrence over time. The application leverages SwiftUI for the user interface and Swift Charts for data visualization.

## 2. Technical Stack
*   **Language**: Swift 5+
*   **UI Framework**: SwiftUI
*   **Visualization**: Swift Charts (requires iOS 16.0+)
*   **Architecture**: MVVM (Model-View-ViewModel)
*   **Persistence**: (Inferred) Local storage managed by `DataStore`.

## 3. Data Model

### 3.1 Core Entities
Based on usage in the Analytics module, the application relies on the following data structures:

*   **Thing**
    *   `id`: UUID - Unique identifier.
    *   `name`: String - Display name of the event type.
    *   `color`: Color (or serializable representation) - Visual distinction in UI and Charts.
    *   `logs`: [LogEntry] - Collection of occurrence records.

*   **LogEntry**
    *   `date`: Date - Timestamp of the event occurrence.

### 3.2 Data Store
*   **DataStore**: An `ObservableObject` responsible for:
    *   Holding the state of all `Thing` objects.
    *   Publishing changes to views (e.g., via `@Published var things`).

## 4. User Interface & Features

### 4.1 Analytics Module (`AnalyticsView`)
The Analytics module is a primary feature providing insights into tracking habits.

#### 4.1.1 Filtering & Controls
*   **Chart Type Selection**: Toggle between "Frequency" and "Time of Day".
*   **Entity Filter**: A grid of toggle buttons allowing users to show/hide specific "Things" from the charts.
*   **Date Range**: Start and End date pickers to scope the analysis.

#### 4.1.2 Frequency Chart
*   **Purpose**: Visualizes how often events occur over a timeline.
*   **Visualization**: Line chart with point marks.
*   **Granularity**: Users can group data by Day, Month, or Year.
*   **Dynamic Scaling**: Y-axis scales dynamically based on the maximum count in the selected range.

#### 4.1.3 Time of Day Chart
*   **Purpose**: Visualizes the distribution of events throughout a 24-hour cycle.
*   **Visualization**: Rule marks (vertical lines) indicating the time of occurrence, with point marks sized by density/count.
*   **Scaling**: Supports Hourly or finer granularity.
*   **Layout**: Vertical scrolling layout to accommodate detailed time slots.

#### 4.1.4 Custom Legend
*   A dynamically generated legend mapping `Thing` names to their assigned colors, ensuring consistency across different chart types.

## 5. Code Structure & Logic

### 5.1 Data Processing
*   **`getFilteredThingsWithLogs()`**: Filters the global state based on user selection (IDs and Date Range).
*   **`updateFrequencyChartData()`**: Aggregates log counts based on the selected `DateGranularity` (Day/Month/Year).
*   **`updateTimeOfDayChartData()`**: Maps logs to a 24-hour float value for time-based plotting.

### 5.2 View Components
*   **`frequencyChart`**: `@ViewBuilder` encapsulating the Swift Chart logic for frequency.
*   **`timeOfDayChart`**: `@ViewBuilder` encapsulating the Swift Chart logic for time distribution.
*   **`customChartLegend`**: A `LazyVGrid` rendering the color key.

### 5.3 Helper Types
*   **`ChartDataPoint`**: Struct used to flatten data for the Frequency Chart.
*   **`TimeOfDayDataPoint`**: Struct used to flatten data for the Time of Day Chart.
*   **`ChartType`**: Enum (`.frequency`, `.timeOfDay`).
*   **`DateGranularity`**: Enum (`.day`, `.month`, `.year`).
*   **`TimeDetailScale`**: Enum (`.hourly`, etc.).

## 6. Future Improvements
*   **Data Persistence**: Ensure `DataStore` persists to disk (CoreData or SwiftData).
*   **Export**: Ability to export chart data as CSV.
*   **Accessibility**: Ensure all chart elements have appropriate VoiceOver labels.
*   **Performance**: Optimize `updateChartData` for large datasets by moving calculation off the main thread.
