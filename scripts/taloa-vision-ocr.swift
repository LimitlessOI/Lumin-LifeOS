#!/usr/bin/env swift
// SYNOPSIS: Local macOS Vision OCR helper for Taloa remote relay.
// Reads an already-authorized Taloa screen capture and emits text + pixel boxes.
// @ssot docs/products/universal-overlay/PRODUCT_HOME.md
import Foundation
import Vision
import ImageIO

struct Item: Codable {
    let text: String
    let confidence: Float
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct Output: Codable {
    let ok: Bool
    let imageWidth: Int
    let imageHeight: Int
    let items: [Item]
}

guard CommandLine.arguments.count >= 2 else {
    fputs("usage: taloa-vision-ocr.swift <image>\n", stderr)
    exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL
guard let src = CGImageSourceCreateWithURL(url, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
    let out = Output(ok: false, imageWidth: 0, imageHeight: 0, items: [])
    let data = try! JSONEncoder().encode(out)
    print(String(data: data, encoding: .utf8)!)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-US"]
let handler = VNImageRequestHandler(cgImage: image, options: [:])
try handler.perform([request])

var items: [Item] = []
for observation in request.results ?? [] {
    guard let candidate = observation.topCandidates(1).first else { continue }
    let b = observation.boundingBox
    // Vision coordinates are normalized with origin at bottom-left.
    // Emit pixel coordinates with origin at top-left to match capture/global CG space.
    let px = b.origin.x * Double(image.width)
    let py = (1.0 - b.origin.y - b.height) * Double(image.height)
    let pw = b.width * Double(image.width)
    let ph = b.height * Double(image.height)
    items.append(Item(text: candidate.string, confidence: candidate.confidence,
                      x: px, y: py, width: pw, height: ph))
}

let out = Output(ok: true, imageWidth: image.width, imageHeight: image.height, items: items)
let enc = JSONEncoder()
let data = try enc.encode(out)
print(String(data: data, encoding: .utf8)!)
