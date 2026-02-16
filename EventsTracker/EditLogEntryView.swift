import SwiftUI
import MapKit

/// A form to edit an existing log entry.
struct EditLogEntryView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var store: DataStore
    @Binding var thing: Thing // This binding is to the parent Thing model
    var log: LogEntry
    
    @State private var date: Date
    @State private var note: String
    
    init(store: DataStore, thing: Binding<Thing>, log: LogEntry) {
        self.store = store
        self._thing = thing
        self.log = log
        _date = State(initialValue: log.date)
        _note = State(initialValue: log.note ?? "")
    }
    
    var body: some View {
        Form { // The form now contains the editable fields for the log entry
            DatePicker("Date and Time", selection: $date)

            Section(header: Text("Note (Optional)"), footer: Text("\(note.count) / 500")) {
                TextEditor(text: $note)
                    .frame(height: 100)
                    .onChange(of: note) {
                        if note.count > 500 {
                            note = String(note.prefix(500))
                        }
                    }
            }

            Section(header: Text("Location")) {
                if let location = log.location {
                    Map(position: .constant(.automatic)) {
                        Marker(thing.name, coordinate: CLLocationCoordinate2D(
                            latitude: location.latitude,
                            longitude: location.longitude
                        ))
                    }
                    .frame(height: 200)
                } else {
                    Text("No location data available for this entry.")
                }
            }
        }
        .navigationTitle("Edit Log")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Save") {
                    // Find the specific log within the Thing's logs array and update it.
                    if let logIndex = thing.logs.firstIndex(where: { $0.id == log.id }) {
                        thing.logs[logIndex].date = date
                        thing.logs[logIndex].note = note.isEmpty ? nil : note
                        // Save the entire data store, which persists the change.
                        store.save()
                    }
                    dismiss()
                }
            }
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") {
                    dismiss()
                }
            }
        }
    }
}
