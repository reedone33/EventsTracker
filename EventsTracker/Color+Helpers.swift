import SwiftUI

extension Color {
    /// Initializes a SwiftUI Color from a serializable ColorData struct.
    init(_ colorData: ColorData) {
        self.init(red: colorData.red, green: colorData.green, blue: colorData.blue)
    }

    /// Converts a SwiftUI Color to a serializable ColorData struct.
    /// - Returns: A `ColorData` instance containing RGB components.
    func toColorData() -> ColorData {
        // Use UIColor to get the components, as SwiftUI.Color doesn't expose them directly.
        let uiColor = UIColor(self)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        
        uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        
        return ColorData(red: Double(red), green: Double(green), blue: Double(blue))
    }
}