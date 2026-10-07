fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let output =
            std::path::PathBuf::from(std::env::var("OUT_DIR").expect("Cargo output directory"));
        let binary_directory = output.ancestors().nth(3).expect("Cargo binary directory");
        for name in [
            "msvcp140.dll",
            "msvcp140_1.dll",
            "vcruntime140.dll",
            "vcruntime140_1.dll",
        ] {
            let source = std::path::Path::new("resources/windows-runtime").join(name);
            println!("cargo:rerun-if-changed={}", source.display());
            std::fs::copy(&source, binary_directory.join(name))
                .expect("Copy bundled Windows runtime");
            // Development examples live one level below the application executable.
            let examples = binary_directory.join("examples");
            std::fs::create_dir_all(&examples).expect("Create examples directory");
            std::fs::copy(&source, examples.join(name)).expect("Copy example runtime");
        }
    }
    tauri_build::build();
    // The standalone WebView2 smoke-test example needs the same common-controls
    // activation as the desktop executable (Tauri embeds that only for the app).
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-arg-examples=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg-examples=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'");
    }
}
