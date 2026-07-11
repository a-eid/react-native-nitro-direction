require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "LayoutDirection"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/a-eid/react-native-nitro-direction.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift}",
    "ios/**/*.{h,m,mm}",
    "cpp/**/*.{hpp,cpp}",
  ]

  # The ObjC bridge header MUST be a *public* header (NOT private) so that
  # CocoaPods includes it in the auto-generated modulemap + umbrella header.
  # With `SWIFT_INSTALL_OBJC_HEADER=NO` (set by add_nitrogen_files for Xcode 26),
  # the bridging-header mechanism is disabled, so Swift can only reach ObjC/C
  # symbols through the pod's own module. Private headers are deliberately
  # excluded from the modulemap, which is what made Swift fail with
  # "cannot find 'LayoutDirectionIsRTL' in scope".
  #
  # MUST be set BEFORE add_nitrogen_files — that function reads the current
  # public_header_files and appends the generated C++ headers (Direction.hpp,
  # HybridLayoutDirectionSpec.hpp, the Swift-Cxx bridge) to it. Setting it
  # after would overwrite and wipe out the C++ namespace headers, breaking
  # Swift with "cannot find type 'margelo' in scope".
  s.public_header_files = ["ios/**/*.{h}"]

  load 'nitrogen/generated/ios/LayoutDirection+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
