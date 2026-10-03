// Where a share lives and the links the share buttons open (core/share/urls.ts). Every link carries UTM tags so GA4
// attributes the visit to the share and the place it was posted.

import Foundation

/// Where a share link was posted from: one `utm_source` each.
public enum ShareSource: String, Sendable {
    case x, facebook
    case copyLink = "copy_link"
    case shareSheet = "share_sheet"
}

/// Platforms with a web "compose a post" URL.
public enum PostPlatform: Sendable {
    case x, facebook
}

public let SHARE_IMAGES_BUCKET = "share-images"

/// JavaScript's `encodeURIComponent`: everything but `A-Z a-z 0-9 - _ . ! ~ * ' ( )` is percent-encoded (UTF-8).
public func encodeURIComponent(_ value: String) -> String {
    let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()")
    return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
}

/// `a=1&b=2` in the given order.
private func query(_ params: [(String, String)]) -> String {
    params.map { "\(encodeURIComponent($0.0))=\(encodeURIComponent($0.1))" }.joined(separator: "&")
}

public func sharePath(_ id: String) -> String {
    "/s/\(id)"
}

/// The share page URL as posted from `source`.
public func shareUrl(origin: String, id: String, source: ShareSource) -> String {
    "\(origin)\(sharePath(id))?\(query([("utm_source", source.rawValue), ("utm_medium", "social"), ("utm_campaign", "share")]))"
}

/// Object name inside the public `share-images` bucket.
public func shareImageObject(_ id: String) -> String {
    "\(id).jpg"
}

/// Public URL of the share's card image (what `og:image` points at).
public func shareImageUrl(supabaseUrl: String, id: String) -> String {
    var base = supabaseUrl
    while base.hasSuffix("/") { base.removeLast() }
    return "\(base)/storage/v1/object/public/\(SHARE_IMAGES_BUCKET)/\(shareImageObject(id))"
}

/// The platform's compose window with the link (and, on X, the text) filled in. Facebook does not take text.
public func postIntentUrl(platform: PostPlatform, url: String, text: String) -> String {
    switch platform {
    case .x: return "https://x.com/intent/tweet?\(query([("text", text), ("url", url)]))"
    case .facebook: return "https://www.facebook.com/sharer/sharer.php?\(query([("u", url)]))"
    }
}
