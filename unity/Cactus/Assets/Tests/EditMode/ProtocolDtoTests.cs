using System.Collections.Generic;
using System.IO;
using Cactus.Protocol;
using GameDevWare.Serialization;
using NUnit.Framework;

namespace Cactus.Tests
{
    public sealed class ProtocolDtoTests
    {
        [Test]
        public void LobbyPayloadRoundTripsWithColyseusMessagePackSettings()
        {
            var source = new LobbyDto
            {
                roomId = "CAC-7XQ2",
                hostSessionId = "host-session",
                players = new List<LobbyPlayerDto>
                {
                    new LobbyPlayerDto
                    {
                        sessionId = "host-session",
                        name = "SageStrider",
                        avatarId = "sage"
                    }
                }
            };

            var stream = new MemoryStream();
            MsgPack.Serialize(source, stream, SerializationOptions.SuppressTypeInformation);
            stream.Position = 0;
            var decoded = MsgPack.Deserialize<LobbyDto>(stream, SerializationOptions.SuppressTypeInformation);

            Assert.That(decoded.roomId, Is.EqualTo("CAC-7XQ2"));
            Assert.That(decoded.hostSessionId, Is.EqualTo("host-session"));
            Assert.That(decoded.players, Has.Count.EqualTo(1));
            Assert.That(decoded.players[0].avatarId, Is.EqualTo("sage"));
        }
    }
}
