import SwiftUI
import Charts

/// A chart view visualizing the time of day events occurred.
struct TimeOfDayChartView: View {
    var thing: Thing
    @State private var chartData: [TimeOfDayDataPoint] = []
    @State private var timeScale: TimeDetailScale = .hourly

    var body: some View {
        VStack {
            if chartData.isEmpty {
                Text("No data to display for this chart.")
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                VStack {
                    Text("\(thing.name) Time of Day")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Picker("Scale", selection: $timeScale) {
                        ForEach(TimeDetailScale.allCases) { scale in
                            Text(scale.localizedName).tag(scale)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: timeScale) {
                        updateChartData()
                    }
                    
                    Chart(chartData) { dataPoint in
                        // Skinny vertical line
                        RuleMark(
                            x: .value("Date", dataPoint.date, unit: .day),
                            yStart: .value("Time", 0),
                            yEnd: .value("Time", dataPoint.hour)
                        )
                        .foregroundStyle(Color(thing.color).opacity(0.3))
                        .lineStyle(StrokeStyle(lineWidth: 1))

                        // Circle at the top
                        PointMark(
                            x: .value("Date", dataPoint.date, unit: .day),
                            y: .value("Time", dataPoint.hour)
                        )
                        .foregroundStyle(Color(thing.color))
                        .symbolSize(CGFloat(100 + (dataPoint.count - 1) * 75)) // Base size + increment for each extra log
                    }
                    .chartYScale(domain: 0...24)
                    .chartYAxis {
                        // Show a mark for every hour
                        AxisMarks(values: .stride(by: 1)) { value in
                            AxisGridLine()
                            AxisTick()
                            if let hour = value.as(Int.self) {
                                AxisValueLabel(horizontalSpacing: 10) {
                                    // Format hour for AM/PM display
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
                    // Make the chart tall to allow for scrolling through hours
                    .frame(height: 24 * 40)
                }
            }
        }
        .onAppear(perform: updateChartData)
        .padding()
    }

    /// Groups logs by time (hour or minute) to prepare data for the chart.
    private func updateChartData() {
        let calendar = Calendar.current
        
        // Define a closure to group logs based on the selected time scale. This is safer than force-unwrapping.
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
        
        // Group logs using the closure, then create data points for the chart.
        let groupedByHour = Dictionary(grouping: thing.logs, by: groupingClosure)
        
        chartData = groupedByHour.map { (key, logs) in
            let hourComponent = calendar.component(.hour, from: key)
            let minuteComponent = calendar.component(.minute, from: key)
            let decimalHour = Double(hourComponent) + (Double(minuteComponent) / 60.0)
            return TimeOfDayDataPoint(date: calendar.startOfDay(for: key), hour: decimalHour, count: logs.count, thingName: thing.name)
        }.sorted { $0.date < $1.date }
    }
}