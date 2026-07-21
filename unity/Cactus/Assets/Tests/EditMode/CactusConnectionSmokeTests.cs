using System.Collections;
using Cactus.Network;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Cactus.Tests
{
    public sealed class CactusConnectionSmokeTests
    {
        [UnityTest]
        [Explicit("Requires the local Cactus Colyseus server at ws://localhost:2567.")]
        public IEnumerator CreateRoomReceivesLobbyFromLocalServer()
        {
            var client = new CactusRoomClient(CactusEndpoint.LocalDefault);
            var connect = client.CreateAsync("Unity smoke", "sage");

            yield return new WaitUntil(() => connect.IsCompleted);
            Assert.That(connect.IsFaulted, Is.False, connect.Exception == null ? string.Empty : connect.Exception.ToString());

            yield return new WaitUntil(() => client.Lobby != null);
            Assert.That(client.Lobby.roomId, Is.Not.Empty);
            Assert.That(client.Lobby.players, Has.Count.EqualTo(1));

            var leave = client.LeaveAsync();
            yield return new WaitUntil(() => leave.IsCompleted);
            Assert.That(leave.IsFaulted, Is.False, leave.Exception == null ? string.Empty : leave.Exception.ToString());
        }
    }
}
