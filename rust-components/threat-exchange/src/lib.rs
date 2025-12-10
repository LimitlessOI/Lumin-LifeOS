```rust
extern crate crypto;

use crypto::digest::Digest;
use crypto::sha2::Sha256;

pub struct ThreatExchange {
    key: Vec<u8>,
}

impl ThreatExchange {
    pub fn new(key: Vec<u8>) -> Self {
        ThreatExchange { key }
    }

    pub fn encrypt(&self, data: &str) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.input_str(data);
        hasher.result_str().as_bytes().to_vec()
    }

    pub fn decrypt(&self, encrypted_data: Vec<u8>) -> String {
        // Implement decryption logic here
        String::from_utf8(encrypted_data).expect("Invalid UTF-8 sequence")
    }
}

fn main() {
    let exchange = ThreatExchange::new(b"my_secret_key".to_vec());
    let data = "Sensitive threat data";
    let encrypted_data = exchange.encrypt(data);
    println!("Encrypted data: {:?}", encrypted_data);
    let decrypted_data = exchange.decrypt(encrypted_data);
    println!("Decrypted data: {:?}", decrypted_data);
}