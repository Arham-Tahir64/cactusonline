using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Cactus.Protocol;
using Colyseus;

namespace Cactus.Network
{
    // The TypeScript server stays authoritative. This type only transports intent
    // and keeps the newest redacted server view for the Unity presentation layer.
    public sealed class CactusRoomClient
    {
        private const string RoomName = "cactus";

        private readonly ColyseusClient client;
        private ColyseusRoom<NoState> room;

        public CactusRoomClient(string endpoint)
        {
            Endpoint = CactusEndpoint.Normalize(endpoint);
            client = new ColyseusClient(Endpoint);
        }

        public string Endpoint { get; }
        public string RoomId => room == null ? null : room.RoomId;
        public string SessionId => room == null ? null : room.SessionId;
        public bool IsConnected => room != null;
        public LobbyDto Lobby { get; private set; }
        public RoomViewDto View { get; private set; }

        public event Action<LobbyDto> LobbyReceived;
        public event Action<RoomViewDto> ViewReceived;
        public event Action<RevealedDto> RevealedReceived;
        public event Action<PublicEventDto> EventReceived;
        public event Action<ScoresDto> ScoresReceived;
        public event Action<ErrorDto> ErrorReceived;
        public event Action<int, string> TransportError;
        public event Action<int> Left;

        public Task CreateAsync(string name, string avatarId)
        {
            return ConnectAsync(() => client.Create(RoomName, PlayerOptions(name, avatarId)));
        }

        public Task JoinAsync(string roomCode, string name, string avatarId)
        {
            if (string.IsNullOrWhiteSpace(roomCode))
            {
                throw new ArgumentException("A room code is required.", nameof(roomCode));
            }

            return ConnectAsync(() => client.JoinById(roomCode.Trim().ToUpperInvariant(), PlayerOptions(name, avatarId)));
        }

        public async Task LeaveAsync()
        {
            if (room == null)
            {
                return;
            }

            var departingRoom = room;
            room = null;
            await departingRoom.Leave();
        }

        public Task StartAsync() => SendAsync("start");
        public Task DrawDeckAsync() => SendAsync("draw-deck");
        public Task DrawDiscardAsync(string slotId) => SendAsync("draw-discard", new SlotMessage(slotId));
        public Task SwapAsync(string slotId) => SendAsync("swap", new SlotMessage(slotId));
        public Task DiscardDrawnAsync() => SendAsync("discard-drawn");
        public Task PlayActionAsync() => SendAsync("play-action");
        public Task PeekOwnAsync(string slotId) => SendAsync("peek-own", new SlotMessage(slotId));
        public Task PeekOpponentAsync(BoardTargetDto target) => SendAsync("peek-opponent", new TargetMessage(target));
        public Task JackSwapAsync(BoardTargetDto a, BoardTargetDto b) => SendAsync("jack-swap", new JackSwapMessage(a, b));
        public Task QueenLookAsync(BoardTargetDto target) => SendAsync("queen-look", new TargetMessage(target));
        public Task QueenSwapAsync(BoardTargetDto target) => SendAsync("queen-swap", new TargetMessage(target));
        public Task CallCactusAsync() => SendAsync("call-cactus");
        public Task AttemptMatchAsync(BoardTargetDto target) => SendAsync("attempt-match", new TargetMessage(target));
        public Task GiveAsync(string slotId) => SendAsync("give", new SlotMessage(slotId));
        public Task RematchAsync() => SendAsync("rematch");

        private async Task ConnectAsync(Func<Task<ColyseusRoom<NoState>>> connect)
        {
            if (room != null)
            {
                throw new InvalidOperationException("Leave the current room before joining another one.");
            }

            room = await connect();
            Subscribe(room);
        }

        private void Subscribe(ColyseusRoom<NoState> connectedRoom)
        {
            connectedRoom.OnMessage<LobbyDto>("lobby", payload =>
            {
                Lobby = payload;
                LobbyReceived?.Invoke(payload);
            });
            connectedRoom.OnMessage<RoomViewDto>("view", payload =>
            {
                View = payload;
                ViewReceived?.Invoke(payload);
            });
            connectedRoom.OnMessage<RevealedDto>("revealed", payload => RevealedReceived?.Invoke(payload));
            connectedRoom.OnMessage<PublicEventDto>("event", payload => EventReceived?.Invoke(payload));
            connectedRoom.OnMessage<ScoresDto>("scores", payload => ScoresReceived?.Invoke(payload));
            connectedRoom.OnMessage<ErrorDto>("error", payload => ErrorReceived?.Invoke(payload));
            connectedRoom.OnError += (code, message) => TransportError?.Invoke(code, message);
            connectedRoom.OnLeave += code => Left?.Invoke(code);
        }

        private Task SendAsync(string type)
        {
            return RequireRoom().Send(type);
        }

        private Task SendAsync(string type, object payload)
        {
            return RequireRoom().Send(type, payload);
        }

        private ColyseusRoom<NoState> RequireRoom()
        {
            if (room == null)
            {
                throw new InvalidOperationException("Join a Cactus room before sending game actions.");
            }

            return room;
        }

        private static Dictionary<string, object> PlayerOptions(string name, string avatarId)
        {
            return new Dictionary<string, object>
            {
                { "name", name ?? string.Empty },
                { "avatarId", avatarId ?? string.Empty }
            };
        }

        [Serializable]
        private sealed class SlotMessage
        {
            public string slotId;
            public SlotMessage(string value) { slotId = value; }
        }

        [Serializable]
        private sealed class TargetMessage
        {
            public BoardTargetDto target;
            public TargetMessage(BoardTargetDto value) { target = value; }
        }

        [Serializable]
        private sealed class JackSwapMessage
        {
            public BoardTargetDto a;
            public BoardTargetDto b;
            public JackSwapMessage(BoardTargetDto first, BoardTargetDto second) { a = first; b = second; }
        }
    }
}
