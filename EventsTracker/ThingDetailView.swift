import SwiftUI

/// A detailed view for a specific "Thing", showing its history and charts.
struct ThingDetailView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var store: DataStore
    var thingId: UUID
    @State private var showingAddLog = false
    @State private var selectedChartType: ChartType = .frequency
    @State private var showingExportView = false
    @State private var showingCategoryMap = false // State to control the CategoryMapView sheet
    @State private var showingEditThing = false // State to control the EditThingView sheet
    @State private var logToEdit: LogEntry?

    /// This computed property provides a stable binding directly to the 'thing' in the DataStore.
    /// This is the key to fixing the auto-closing issue when updates occur.
    private var thingBinding: Binding<Thing> {
        // Find the index of our thing in the store's array using its ID.
        guard let index = store.things.firstIndex(where: { $0.id == thingId }) else {
            // If the thing is not found (e.g., it was deleted), return a constant binding to prevent a crash.
            // We create a dummy thing to avoid crashing the UI.
            return .constant(Thing(id: thingId, name: "Deleted", color: Color.red.toColorData()))
        }
        // Return a direct binding to the element in the store's @Published array.
        return $store.things[index]
    }

    var body: some View {
        List {
            Section {
                Picker("Chart Type", selection: $selectedChartType) {
                    ForEach(ChartType.allCases) { type in
                        Text(type.localizedName).tag(type)
                    }
                }
                .pickerStyle(.segmented)

                chartView()
            }
            
            ForEach(thingBinding.wrappedValue.logs.sorted(by: { $0.date > $1.date })) { log in
                Button(action: {
                    logToEdit = log
                }) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(log.date.formatted(date: .numeric, time: .standard))
                                .font(.headline)
                                .foregroundColor(.primary)

                            if let note = log.note, !note.isEmpty {
                                Text(note)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .lineLimit(2)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .onDelete { offsets in
                deleteLogs(at: offsets)
            }
        }
        .navigationTitle(thingBinding.wrappedValue.name)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack {
                    // Button to open the EditThingView
                    Button {
                        showingEditThing = true
                    } label: {
                        Image(systemName: "pencil")
                    }
                    
                    Button {
                        showingExportView = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }

                    EditButton()
                    Button {
                        showingAddLog = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            ToolbarItem(placement: .navigationBarLeading) {
                HStack {
                    Button("Done") {
                        dismiss()
                    }
                    // Button to show the Category Map for this specific thing
                    Button {
                        showingCategoryMap = true
                    } label: {
                        Image(systemName: "map.fill")
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddLog) {
            NavigationView {
                AddLogEntryView(store: store, thing: thingBinding)
            }
        }
        .sheet(isPresented: $showingExportView) {
            ExportView(store: store, thing: thingBinding.wrappedValue)
        }
        // Present the CategoryMapView as a sheet
        .sheet(isPresented: $showingCategoryMap) {
            CategoryMapView(store: store, thing: thingBinding.wrappedValue)
        }
        .sheet(isPresented: $showingEditThing) {
            EditThingView(store: store, thing: thingBinding)
        }
        .sheet(item: $logToEdit) { log in
            NavigationView {
                EditLogEntryView(store: store, thing: thingBinding, log: log)
            }
        }
    }
    
    /// Builds the appropriate chart view based on the selected type.
    @ViewBuilder
    private func chartView() -> some View {
        if selectedChartType == .frequency {
            ThingChartView(thing: thingBinding.wrappedValue)
                .frame(height: 400)
        } else {
            TimeOfDayChartView(thing: thingBinding.wrappedValue)
        }
    }
    
    /// Deletes log entries at the specified offsets.
    func deleteLogs(at offsets: IndexSet) {
        // Get the logs that are currently displayed, in their sorted order, from the binding.
        let sortedLogs = thingBinding.wrappedValue.logs.sorted(by: { $0.date > $1.date })
        
        // Create an IndexSet of the logs to remove from the original, unsorted array.
        var indicesToRemove = IndexSet()
        for offset in offsets {
            let logToDelete = sortedLogs[offset]
            if let indexInOriginalArray = thingBinding.wrappedValue.logs.firstIndex(where: { $0.id == logToDelete.id }) {
                indicesToRemove.insert(indexInOriginalArray)
            }
        }
        thingBinding.wrappedValue.logs.remove(atOffsets: indicesToRemove)
        store.save()
    }
}
