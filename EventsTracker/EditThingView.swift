import SwiftUI

/// A form to edit an existing "Thing".
struct EditThingView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var store: DataStore
    
    @Binding var thing: Thing
    
    @State private var name: String
    @State private var color: Color
    
    init(store: DataStore, thing: Binding<Thing>) {
        self.store = store
        self._thing = thing
        _name = State(initialValue: thing.wrappedValue.name)
        _color = State(initialValue: Color(thing.wrappedValue.color))
    }
    
    var body: some View {
        NavigationView {
            Form {
                TextField("Thing name", text: $name)
                ColorPicker("Choose color", selection: $color)
            }
            .navigationTitle("Edit Thing")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveChanges()
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
    
    /// Saves changes to the Thing and persists to the store.
    private func saveChanges() {
        thing.name = name
        thing.color = color.toColorData()
        store.save()
    }
}                    