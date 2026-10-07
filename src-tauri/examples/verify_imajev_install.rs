//! Offline install/worker smoke test using a copy of an existing optional package.
//! cargo run --example verify_imajev_install -- <isolated app-data directory>
//! Place the package and official runtime DLLs under classifiers/v0.1.0-embedding-vision-int4.
fn main() {
    if wordrop_lib::run_classifier_worker() {
        return;
    }
    let data = std::path::PathBuf::from(
        std::env::args_os()
            .nth(1)
            .expect("isolated app-data directory"),
    );
    let state = wordrop_lib::imajev::DownloadState::default();
    let result =
        tauri::async_runtime::block_on(state.download(data)).expect("verified local installation");
    assert!(result.ready);
    println!("{}", serde_json::to_string(&result).unwrap());
}
