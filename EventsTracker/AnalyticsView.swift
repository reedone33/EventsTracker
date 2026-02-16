import SwiftUI
import Charts

/// A comprehensive analytics view comparing multiple "Things" with various charts.
struct AnalyticsView: View {
    @ObservedObject var store: DataStore
    @Environment(\.dismiss) var dismiss

    @State private var chartData: [ChartDataPoint] = []
    @State private var selectedThingIds: Set<UUID> = []
    @State private var timeOfDayChartData: [TimeOfDayDataPoint] = []
    @State private var selectedChartType: ChartType = .frequency
    @State private var timeScale: TimeDetailScale = .hourly
    @State private var dateGranularity: DateGranularity = .day

    // Date range filter states
    @State private var startDate: Date = Calendar.current.date(byAdding: .month, value: -3, to: Date()) ?? Date()
    @State private var endDate: Date = Date()

    /// A computed property that creates a unique mapping of thing names to their colors.
    /// This is used to ensure the chart legend is correct and avoids complex logic in the `body`.
    private var chartColorMap: [String: Color] {
        var uniqueColors: [String: Color] = [:]
        // Use store.things to ensure all selected things are in the legend, even if they have no data in the range.
        for thing in store.things.filter({ selectedThingIds.contains($0.id) }) {
            uniqueColors[thing.name] = Color(thing.color)
        }
        return uniqueColors
    }

    /// The domain (legend items) for the chart, sorted alphabetically.
    private var chartDomain: [String] {
        Array(chartColorMap.keys).sorted()
    }

    /// The range (colors) for the chart, corresponding to the sorted domain.
    private var chartRange: [Color] {
        chartDomain.map { chartColorMap[$0]! }
    }

    /// The maximum count for the frequency chart, used to set the Y-axis domain.
    private var maxFrequencyCount: Int {
        chartData.map { $0.count }.max() ?? 1
    }

    /// Calculates a reasonable integer step for the Y-axis labels to avoid clutter.
    private var yAxisStride: Int {
        if maxFrequencyCount < 10 {
            return 1
        }
        // For larger numbers, calculate a 'nice' step value (e.g., 5, 10, 50)
        let step = pow(10, floor(log10(Double(maxFrequencyCount)))) / 2
        return Int(max(1, step.rounded()))
    }

    /// The values for the Y-axis marks, generated from the stride.
    private var yAxisValues: [Int] {
        // Ensure we don't get into an infinite loop if stride is 0
        guard yAxisStride > 0 else { return [] }
        let maxVal = maxFrequencyCount + 1
        return Array(stride(from: 0, through: maxVal, by: yAxisStride))
    }

    @ViewBuilder
    private var customChartLegend: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), alignment: .leading)], spacing: 10) {
            ForEach(chartDomain, id: \.self) { thingName in
                HStack {
                    Circle()
                        .fill(chartColorMap[thingName] ?? .black)
                        .frame(width: 12, height: 12)
                    Text(thingName)
                        .font(.caption)
                }
            }
        }
        .padding([.horizontal, .top])
    }

    // MARK: - Chart Views

    @ViewBuilder
    private var frequencyChart: some View {
        VStack {
            if chartData.isEmpty {
                Text("No data to display for this chart.")
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                HStack {
                    Text("Tracking Frequency")
                        .font(.title2)
                        .fontWeight(.bold)
                    Spacer()
                    Picker("Granularity", selection: $dateGranularity) {
                        ForEach(DateGranularity.allCases) { granularity in
                            Text(granularity.localizedName).tag(granularity)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: dateGranularity) { updateChartData() }
                    .frame(maxWidth: 200)
                }
                .padding([.top, .horizontal])

                Chart(chartData) { dataPoint in
                    LineMark(
                        x: .value("Date", dataPoint.date),
                        y: .value("Count", dataPoint.count)
                    )
                    .foregroundStyle(by: .value("Thing", dataPoint.thingName))
                    .lineStyle(StrokeStyle(lineWidth: 3))

                    PointMark(
                        x: .value("Date", dataPoint.date),
                        y: .value("Count", dataPoint.count)
                    )
                    .foregroundStyle(by: .value("Thing", dataPoint.thingName))
                    .symbolSize(100)
                }
                .chartYScale(domain: 0...(maxFrequencyCount + 1))
                .chartForegroundStyleScale(domain: chartDomain, range: chartRange)
                .chartLegend(.hidden)
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 12)) { value in
                        AxisTick()
                        if let date = value.as(Date.self) {
                            switch dateGranularity {
                            case .day:
                                AxisValueLabel(date.formatted(.dateTime.month(.defaultDigits).day()))
                            case .month:
                                AxisValueLabel(date.formatted(.dateTime.month(.abbreviated).year(.twoDigits)))
                            case .year:
                                AxisValueLabel(date.formatted(.dateTime.year()))
                            }
                        }
                    }
                }
                .chartYAxis {
                    AxisMarks(values: yAxisValues) { value in // No more grid lines
                        AxisTick()
                        if let count = value.as(Int.self), count >= 0 {
                            AxisValueLabel("\(count)")
                        }
                    }
                }
                .frame(height: 500)
                .padding(.horizontal)

                customChartLegend
            }
        }
    }

    @ViewBuilder
    private var timeOfDayChart: some View {
        VStack {
            if timeOfDayChartData.isEmpty {
                Text("No data to display for this chart.")
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                Text("Time of Day")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top)

                Picker("Scale", selection: $timeScale) {
                    ForEach(TimeDetailScale.allCases) { scale in
                        Text(scale.localizedName).tag(scale)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .onChange(of: timeScale) { updateChartData() }

                Chart(timeOfDayChartData) { dataPoint in
                    RuleMark(
                        x: .value("Date", dataPoint.date, unit: .day),
                        yStart: .value("Time", 0),
                        yEnd: .value("Time", dataPoint.hour)
                    )
                    .foregroundStyle(by: .value("Thing", dataPoint.thingName))
                    .position(by: .value("Thing", dataPoint.thingName))
                    .lineStyle(StrokeStyle(lineWidth: 2))

                    PointMark(
                        x: .value("Date", dataPoint.date, unit: .day),
                        y: .value("Time", dataPoint.hour)
                    )
                    .foregroundStyle(by: .value("Thing", dataPoint.thingName))
                    .position(by: .value("Thing", dataPoint.thingName))
                    .symbolSize(CGFloat(100 + (dataPoint.count - 1) * 75))
                }
                .chartForegroundStyleScale(domain: chartDomain, range: chartRange)
                .chartLegend(.hidden)
                .chartYScale(domain: 0...24)
                .chartYAxis {
                    AxisMarks(values: .stride(by: 1)) { value in
                        AxisGridLine()
                        AxisTick()
                        if let hour = value.as(Int.self) {
                            AxisValueLabel(horizontalSpacing: 10) {
                                let date = Calendar.current.startOfDay(for: Date()).addingTimeInterval(TimeInterval(hour * 3600))
                                Text(date, format: .dateTime.hour())
                            }
                        }
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 5)) { value in
                        AxisGridLine()
                        AxisTick()
                        if let date = value.as(Date.self) {
                            AxisValueLabel(
                                "\(date.formatted(.dateTime.month(.abbreviated)))\n\(date.formatted(.dateTime.day()))",
                                multiLabelAlignment: .center
                            )
                        }
                    }
                }
                .frame(height: 24 * 40) // Keep chart tall, but now it scrolls with the page

                customChartLegend
            }
        }
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack {
                    Picker("Chart Type", selection: $selectedChartType) {
                        ForEach(ChartType.allCases) { type in
                            Text(type.localizedName).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.top)

                    // Wrapping Filter Toggles
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 10) {
                        ForEach(store.things) { thing in
                            Toggle(isOn: Binding(
                                get: { selectedThingIds.contains(thing.id) },
                                set: { isOn in
                                    if isOn {
                                        selectedThingIds.insert(thing.id)
                                    } else {
                                        selectedThingIds.remove(thing.id)
                                    }
                                    updateChartData()
                                }
                            )) {
                                Text(thing.name)
                                    .font(.caption)
                                    .lineLimit(1)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Color(thing.color))
                                    .foregroundColor(.white)
                                    .cornerRadius(15)
                            }
                            .toggleStyle(.button)
                        }
                    }
                    .padding()

                    // Date Pickers for filtering
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Start Date")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                                .labelsHidden()
                                .onChange(of: startDate) { updateChartData() }
                        }
                        Spacer()
                        VStack(alignment: .leading) {
                            Text("End Date")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                                .labelsHidden()
                                .onChange(of: endDate) { updateChartData() }
                        }
                    }
                    .padding(.horizontal)

                    // The Chart
                    if selectedChartType == .frequency {
                        frequencyChart
                    } else {
                        timeOfDayChart
                    }
                }
            }
            .navigationTitle("Analytics")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            // Select all things by default
            selectedThingIds = Set(store.things.map { $0.id })
            updateChartData()
        }
        .onReceive(store.$things) { _ in
            // Update chart if things in store change
            let newThingIds = Set(store.things.map { $0.id })
            selectedThingIds = selectedThingIds.intersection(newThingIds)
            if selectedThingIds.isEmpty && !newThingIds.isEmpty {
                selectedThingIds = newThingIds
            }
            updateChartData()
        }
    }

    /// Filters the things from the store based on the current UI selections (selected IDs and date range)
    /// and returns an array of tuples, each containing a `Thing` and its filtered `LogEntry` array.
    private func getFilteredThingsWithLogs() -> [(thing: Thing, logs: [LogEntry])] {
        let filteredThings = store.things.filter { selectedThingIds.contains($0.id) }

        let calendar = Calendar.current
        // Adjust end date to include the entire day, as DatePicker sets it to the start of the day.
        guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: endDate)) else {
            return []
        }

        return filteredThings.map { thing in
            let logsInRange = thing.logs.filter { $0.date >= startDate && $0.date < endOfDay }
            return (thing, logsInRange)
        }
    }

    private func updateChartData() {
        let thingsWithLogs = getFilteredThingsWithLogs()
        updateFrequencyChartData(from: thingsWithLogs)
        updateTimeOfDayChartData(from: thingsWithLogs)
    }

    /// Aggregates data for the Frequency Chart based on the selected granularity.
    private func updateFrequencyChartData(from thingsWithLogs: [(thing: Thing, logs: [LogEntry])]) {
        var newChartData: [ChartDataPoint] = []
        let calendar = Calendar.current

        // 1. Create a map of all logs grouped by thing name and then by date granularity.
        var dataMap: [String: [Date: Int]] = [:]
        let component: Calendar.Component
        let groupingClosure: (Date) -> Date

        switch dateGranularity {
        case .day:
            component = .day
            groupingClosure = { date in calendar.startOfDay(for: date) }
        case .month:
            component = .month
            groupingClosure = { date in calendar.date(from: calendar.dateComponents([.year, .month], from: date))! }
        case .year:
            component = .year
            groupingClosure = { date in calendar.date(from: calendar.dateComponents([.year], from: date))! }
        }

        let selectedThings = store.things.filter { selectedThingIds.contains($0.id) }
        for (thing, logs) in thingsWithLogs {
            dataMap[thing.name] = Dictionary(grouping: logs, by: { groupingClosure($0.date) })
                .mapValues { $0.count }
        }

        // 2. Iterate through each day/month/year in the selected date range.
        var currentDate = groupingClosure(startDate)
        let rangeEndDate = groupingClosure(endDate)

        while currentDate <= rangeEndDate {
            // 3. For each date, create a data point for each selected thing (even if count is 0).
            for thing in selectedThings {
                let count = dataMap[thing.name]?[currentDate] ?? 0
                newChartData.append(ChartDataPoint(date: currentDate, count: count, thingName: thing.name, color: thing.color))
            }

            // Move to the next date unit
            guard let nextDate = calendar.date(byAdding: component, value: 1, to: currentDate) else { break }
            currentDate = nextDate
        }

        self.chartData = newChartData.sorted { $0.date < $1.date }
    }

    /// Aggregates data for the Time of Day Chart based on the selected time scale.
    private func updateTimeOfDayChartData(from thingsWithLogs: [(thing: Thing, logs: [LogEntry])]) {
        var newTimeOfDayData: [TimeOfDayDataPoint] = []
        let calendar = Calendar.current

        let groupingClosure: (LogEntry) -> Date
        if timeScale == .hourly {
            groupingClosure = { log in
                let components = calendar.dateComponents([.year, .month, .day, .hour], from: log.date)
                return calendar.date(from: components) ?? log.date
            }
        } else {
            groupingClosure = { log in
                let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: log.date)
                return calendar.date(from: components) ?? log.date
            }
        }

        for (thing, logs) in thingsWithLogs {
            let groupedByHour = Dictionary(grouping: logs, by: groupingClosure)

            for (key, logsInGroup) in groupedByHour {
                let hourComponent = calendar.component(.hour, from: key)
                let minuteComponent = calendar.component(.minute, from: key)
                let decimalHour = Double(hourComponent) + (Double(minuteComponent) / 60.0)

                newTimeOfDayData.append(TimeOfDayDataPoint(
                    date: calendar.startOfDay(for: key),
                    hour: decimalHour,
                    count: logsInGroup.count,
                    thingName: thing.name
                ))
            }
        }

        self.timeOfDayChartData = newTimeOfDayData.sorted { $0.date < $1.date }
    }
}
