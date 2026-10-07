// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if wordrop_lib::run_classifier_worker() {
        return;
    }
    wordrop_lib::run()
}
