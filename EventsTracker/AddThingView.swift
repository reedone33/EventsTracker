import SwiftUI

/// A form to create a new "Thing" to track.
struct AddThingView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var store: DataStore
    
    @State private var name = ""
    @State private var color = Color.red
    
    var body: some View {
        NavigationView {
            Form {
                TextField("Thing name", text: $name)
                ColorPicker("Choose color", selection: $color)
            }
            .navigationTitle("New Thing")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        // Use the new helper to convert Color to ColorData
                        let colorData = color.toColorData()
                        
                        let newThing = Thing(name: name, color: colorData)
                        store.things.append(newThing)
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
}
