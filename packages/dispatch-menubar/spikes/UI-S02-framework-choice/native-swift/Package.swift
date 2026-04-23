// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "ui-s02-native-swift-helloworld",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "ui-s02-native-swift-helloworld",
            path: "Sources"
        )
    ]
)
