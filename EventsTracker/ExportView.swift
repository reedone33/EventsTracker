import SwiftUI

/// A view to export data to CSV format.
struct ExportView: View {
    @ObservedObject var store: DataStore
    @Environment(\.dismiss) var dismiss

    @State private var selectedThingIds: Set<UUID>
    @State private var startDate: Date = Calendar.current.date(byAdding: .year, value: -1, to: Date()) ?? Date()
    @State private var endDate: Date = Date()
    
    @State private var documentURL: URL?
    @State private var isShowingShareSheet = false

    private var singleThing: Thing?

    init(store: DataStore, thing: Thing? = nil) {
        self.store = store
        self.singleThing = thing
        
        if let specificThing = thing {
            _selectedThingIds = State(initialValue: [specificThing.id])
        } else {
            _selectedThingIds = State(initialValue: Set(store.things.map { $0.id }))
        }
    }

    var body: some View {
        NavigationView {
            Form {
                if singleThing == nil {
                    Section(header: Text("Select Things to Export")) {
                        List {
                            ForEach(store.things) { thing in
                                Toggle(isOn: Binding(
                                    get: { selectedThingIds.contains(thing.id) },
                                    set: { isOn in
                                        if isOn {
                                            selectedThingIds.insert(thing.id)
                                        } else {
                                            selectedThingIds.remove(thing.id)
                                        }
                                    }
                                )) {
                                    Text(thing.name)
                                }
                            }
                        }
                    }
                }

                Section(header: Text("Select Date Range")) {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                    DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                }
                
                Section {
                    Button(action: exportData) {
                        Label("Export to CSV", systemImage: "square.and.arrow.up")
                    }
                }
            }
            .navigationTitle(singleThing == nil ? "Export Data" : "Export \(singleThing!.name)")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $isShowingShareSheet) {
                if let url = documentURL {
                    ShareSheet(activityItems: [url])
                }
            }
        }
    }

    /// Generates the CSV string and initiates the share sheet.
    private func exportData() {
        // 1. Filter data
        let thingsToExport = store.things.filter { selectedThingIds.contains($0.id) }
        
        // 2. Build CSV String
        let headerThingName = NSLocalizedString("Thing Name", comment: "CSV header for thing name")
        let headerTimestamp = NSLocalizedString("Timestamp", comment: "CSV header for timestamp")
        let headerLatitude = NSLocalizedString("Latitude", comment: "CSV header for latitude")
        let headerLongitude = NSLocalizedString("Longitude", comment: "CSV header for longitude")
        let headerNote = NSLocalizedString("Note", comment: "CSV header for note")
        
        var csvString = "\(headerThingName),\(headerTimestamp),\(headerLatitude),\(headerLongitude),\(headerNote)\n"
        
        let dateFormatter = ISO8601DateFormatter()

        let calendar = Calendar.current
        // Adjust end date to include the entire day.
        guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: endDate)) else {
            print("Could not calculate end of day for date range.")
            return
        }

        for thing in thingsToExport {
            let logsToExport = thing.logs.filter { $0.date >= startDate && $0.date < endOfDay }
            for log in logsToExport {
                let name = escapeCSVField(thing.name)
                let date = dateFormatter.string(from: log.date)
                let latString = log.location.map { "\($0.latitude)" } ?? ""
                let lonString = log.location.map { "\($0.longitude)" } ?? ""
                let noteString = escapeCSVField(log.note ?? "")
                
                csvString.append("\(name),\(date),\(latString),\(lonString),\(noteString)\n")
            }
        }
        
        // 3. Save to temporary file and show share sheet
        saveAndShare(csvString: csvString)
    }
    
    /// Escapes fields for CSV format (handling quotes and commas).
    private func escapeCSVField(_ field: String) -> String {
        guard !field.isEmpty else { return "" }
        let escapedField = field.replacingOccurrences(of: "\"", with: "\"\"")
        if field.contains(",") || field.contains("\"") || field.contains("\n") {
            return "\"\(escapedField)\""
        } else {
            return escapedField
        }
    }
    
    /// Saves the CSV string to a temporary file and presents the share sheet.
    private func saveAndShare(csvString: String) {
        let fileName = "EventsTracker_Export_\(Date().formatted(.iso8601)).csv"
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        
        do {
            try csvString.write(to: fileURL, atomically: true, encoding: .utf8)
            self.documentURL = fileURL
            self.isShowingShareSheet = true
        } catch {
            print("Failed to create CSV file: \(error.localizedDescription)")
        }
    }
}

/// Helper for showing the standard iOS share sheet.
struct ShareSheet: UIViewControllerRepresentable {
    var activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        return UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}