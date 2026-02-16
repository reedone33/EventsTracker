import SwiftUI
import Charts

/// A view that displays a frequency chart for a specific "Thing".
struct ThingChartView: View {
    var thing: Thing
    @State private var chartData: [ChartDataPoint] = []

    /// Computes the maximum count to scale the Y-axis dynamically.
    private var maxCount: Int {
        chartData.map { $0.count }.max() ?? 1
    }

    var body: some View {
        VStack {
            if chartData.isEmpty {
                Text("No data to display for this chart.")
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                VStack {
                    Text("\(thing.name) Tracking History")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Chart(chartData) { dataPoint in
                        LineMark(
                            x: .value("Date", dataPoint.date, unit: .day),
                            y: .value("Count", dataPoint.count)
                        )
                        .foregroundStyle(Color(thing.color))
                        .lineStyle(StrokeStyle(lineWidth: 3))

                        PointMark(
                            x: .value("Date", dataPoint.date, unit: .day),
                            y: .value("Count", dataPoint.count)
                        )
                        .foregroundStyle(Color(thing.color))
                        .symbolSize(100)
                    }
                    .chartYScale(domain: 0...(maxCount + 1))
                    .chartXAxis {
                        AxisMarks(values: .automatic(desiredCount: 7)) { value in
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
                    .chartYAxis {
                        AxisMarks(values: .automatic(desiredCount: 5)) { value in
                            AxisGridLine()
                            AxisTick()
                            if let count = value.as(Int.self) {
                                AxisValueLabel("\(count)")
                            }
                        }
                    }
                }
            }
        }
        .onAppear {
            updateChartData()
        }
        .padding()
    }

    /// Prepares the data for the chart by grouping logs by date and filling in gaps with zero counts.
    private func updateChartData() {
        guard !thing.logs.isEmpty else {
            chartData = []
            return
        }

        let calendar = Calendar.current

        // Group logs by date and count them
        let groupedByDate = Dictionary(grouping: thing.logs) { log in
            return calendar.startOfDay(for: log.date)
        }.mapValues { $0.count }

        // Find the date range of the logs
        let sortedDates = thing.logs.map { $0.date }.sorted()
        guard let minDate = sortedDates.first, let maxDate = sortedDates.last else {
            chartData = []
            return
        }

        let startOfMinDay = calendar.startOfDay(for: minDate)
        let startOfMaxDay = calendar.startOfDay(for: maxDate)

        var newChartData: [ChartDataPoint] = []
        var currentDate = startOfMinDay

        // Iterate through each day in the range and create a data point, filling with 0 if no logs exist.
        while currentDate <= startOfMaxDay {
            let count = groupedByDate[currentDate] ?? 0
            newChartData.append(ChartDataPoint(date: currentDate, count: count,
                thingName: thing.name,
                color: thing.color))
            currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate)!
        }

        self.chartData = newChartData
    }
}
