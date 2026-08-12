// SYNOPSIS: Native hold-to-talk on the Taloa badge.
// A JS mousedown injected into a hidden WKWebView is not a WebKit user
// gesture, so getUserMedia never starts. Record with AVAudioRecorder and
// send the file to the already-live Voice Rail STT endpoint, then luminSend.
// @ssot docs/products/universal-overlay/PRODUCT_HOME.md
import AVFoundation
import Foundation

enum BadgeVoice {
    static let sttURL = URL(string: "https://lumin-web-production-e3a9.up.railway.app/api/v1/lifeos/voice-rail/stt")!
    static let shared = BadgeVoiceRecorder()

    static func micAuthorized() -> Bool {
        AVCaptureDevice.authorizationStatus(for: .audio) == .authorized
    }

    static func requestPermission() {
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        TaloaLog.write("voice.mic_status", "\(status.rawValue)")
        guard status == .notDetermined else { return }
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            TaloaLog.write("voice.mic", "granted=\(granted)")
        }
    }

    static func transcribe(file: URL, commandKey: String, completion: @escaping (String?, String?) -> Void) {
        guard let audio = try? Data(contentsOf: file), audio.count >= 400 else {
            completion(nil, "audio_too_short")
            return
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: sttURL)
        req.httpMethod = "POST"
        req.setValue(commandKey, forHTTPHeaderField: "x-command-key")
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        func field(_ name: String, _ value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        field("user", "adam")
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"badge.m4a\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/mp4\r\n\r\n".data(using: .utf8)!)
        body.append(audio)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        URLSession.shared.dataTask(with: req) { data, response, error in
            if let error {
                completion(nil, error.localizedDescription)
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                completion(nil, "stt_http_\(status)")
                return
            }
            if json["ok"] as? Bool == true, let text = json["text"] as? String {
                completion(text, nil)
                return
            }
            completion(nil, (json["error"] as? String) ?? "stt_http_\(status)")
        }.resume()
    }
}

final class BadgeVoiceRecorder {
    private var recorder: AVAudioRecorder?
    private var fileURL: URL?

    var isRecording: Bool { recorder?.isRecording == true }

    func start() -> Bool {
        _ = stop()
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("taloa-badge-\(UUID().uuidString).m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16_000,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
        do {
            let rec = try AVAudioRecorder(url: url, settings: settings)
            rec.prepareToRecord()
            guard rec.record() else {
                TaloaLog.write("voice.record_failed", "record() returned false")
                return false
            }
            recorder = rec
            fileURL = url
            TaloaLog.write("voice.record_start", url.lastPathComponent)
            return true
        } catch {
            TaloaLog.write("voice.record_failed", error.localizedDescription)
            return false
        }
    }

    func stop() -> URL? {
        recorder?.stop()
        recorder = nil
        let url = fileURL
        fileURL = nil
        if let url { TaloaLog.write("voice.record_stop", url.lastPathComponent) }
        return url
    }
}
