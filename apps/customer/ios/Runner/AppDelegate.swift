// import UIKit
// import Flutter
// import GoogleMaps

// @main
// @objc class AppDelegate: FlutterAppDelegate {
//   override func application(
//     _ application: UIApplication,
//     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
//   ) -> Bool {
//     GeneratedPluginRegistrant.register(with: self)
//     GMSServices.provideAPIKey("AIzaSyB8sP-JlWwz1QLyhEb_MInGIr8prfgVqBk")
//     return super.application(application, didFinishLaunchingWithOptions: launchOptions)
//   }
// }
import UIKit
import Flutter
import GoogleMaps

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    
    // --- THÊM ĐOẠN NÀY CHO LOCAL NOTIFICATIONS ---
    // Giúp iOS hiển thị thông báo popup ngay cả khi người dùng đang mở app
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self as? UNUserNotificationCenterDelegate
    }
    // ----------------------------------------------

    GeneratedPluginRegistrant.register(with: self)
    GMSServices.provideAPIKey("AIzaSyB8sP-JlWwz1QLyhEb_MInGIr8prfgVqBk")
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}