// Share ids (core/share/ids.ts): short, URL-safe, unguessable slugs (`/s/<id>`). 32 symbols without the look-alikes
// l/o/0/1, so each random byte maps to one symbol without bias (`byte & 31`); 10 symbols = 50 bits.

public let SHARE_ID_ALPHABET = Array("abcdefghijkmnpqrstuvwxyz23456789")
public let SHARE_ID_LENGTH = 10

public enum ShareIdError: Error {
    case notEnoughBytes
}

/// A share id from `SHARE_ID_LENGTH` random bytes (the caller supplies them, e.g. `SystemRandomNumberGenerator`).
public func shareId(fromBytes bytes: [UInt8]) throws -> String {
    guard bytes.count >= SHARE_ID_LENGTH else { throw ShareIdError.notEnoughBytes }
    return String(bytes.prefix(SHARE_ID_LENGTH).map { SHARE_ID_ALPHABET[Int($0 & 31)] })
}

public func isShareId(_ value: String) -> Bool {
    value.count == SHARE_ID_LENGTH && value.allSatisfy { SHARE_ID_ALPHABET.contains($0) }
}
