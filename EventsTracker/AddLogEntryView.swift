import SwiftUI

/// A form to add a new log entry to a "Thing".
struct AddLogEntryView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var store: DataStore
    @Binding var thing: Thing
    
    @State private var date = Date()
    @State private var note = ""
    
    var body: some View {
        Form {
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
        }
        .navigationTitle("New Log Entry")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Save") {
                    let newLog = LogEntry(date: date, note: note.isEmpty ? nil : note)
                    thing.logs.append(newLog)
                    store.save()
                    dismiss()
                }
            }
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") { dismiss() }
            }
        }
    }
}
