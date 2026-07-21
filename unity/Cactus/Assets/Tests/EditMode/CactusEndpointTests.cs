using System;
using Cactus.Network;
using NUnit.Framework;

namespace Cactus.Tests
{
    public sealed class CactusEndpointTests
    {
        [Test]
        public void NormalizeUsesTheLocalDevelopmentDefault()
        {
            Assert.That(CactusEndpoint.Normalize(null), Is.EqualTo("ws://localhost:2567"));
        }

        [Test]
        public void NormalizePreservesSecureEndpointAndRemovesTrailingSlash()
        {
            Assert.That(CactusEndpoint.Normalize(" wss://cactus.example.com/game/ "), Is.EqualTo("wss://cactus.example.com/game"));
        }

        [Test]
        public void NormalizeRejectsNonWebSocketEndpoints()
        {
            Assert.Throws<ArgumentException>(() => CactusEndpoint.Normalize("https://cactus.example.com"));
        }
    }
}
