import Foundation
import SwiftUI
import CoreLocation

/// Manages the persistence of application data using JSON files stored in the Documents directory.
class DataStore: ObservableObject {
    @Published var things: [EventsTracker.Thing] = []
    
    private let savePath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("things.json")
    
    init() {
        load()
    }
    
    /// Loads data from the local JSON file.
    func load() {
        do {
            let data = try Data(contentsOf: savePath)
            things = try JSONDecoder().decode([EventsTracker.Thing].self, from: data)
        } catch {
            things = []
        }
    }
    
    /// Saves the current state to the local JSON file.
    func save() {
        do {
            let data = try JSONEncoder().encode(things)
            try data.write(to: savePath)
        } catch {
            print("Error saving: \(error)")
        }
    }
}
