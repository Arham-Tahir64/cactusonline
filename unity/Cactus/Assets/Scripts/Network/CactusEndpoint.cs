using System;

namespace Cactus.Network
{
    public static class CactusEndpoint
    {
        public const string LocalDefault = "ws://localhost:2567";

        public static string Normalize(string endpoint)
        {
            if (string.IsNullOrWhiteSpace(endpoint))
            {
                return LocalDefault;
            }

            if (!Uri.TryCreate(endpoint.Trim(), UriKind.Absolute, out var uri) ||
                (uri.Scheme != "ws" && uri.Scheme != "wss"))
            {
                throw new ArgumentException("Cactus needs an absolute ws:// or wss:// server endpoint.", nameof(endpoint));
            }

            return uri.GetLeftPart(UriPartial.Authority) + uri.AbsolutePath.TrimEnd('/');
        }
    }
}
