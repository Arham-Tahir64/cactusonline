using System;
using System.Threading.Tasks;
using Cactus.Network;
using Cactus.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Cactus.Presentation
{
    public sealed class CactusLobbyController : MonoBehaviour
    {
        private CactusRoomClient roomClient;
        private GameObject panel;
        private InputField nameInput;
        private InputField codeInput;
        private Text status;
        private Text roster;
        private Button createButton;
        private Button joinButton;
        private Button startButton;
        private LobbyDto displayedLobby;

        private void Start()
        {
            BuildLobby();
        }

        private void Update()
        {
            if (roomClient != null && roomClient.Lobby != null && !ReferenceEquals(roomClient.Lobby, displayedLobby))
            {
                RenderLobby();
            }
        }

        private void OnDestroy()
        {
            if (roomClient != null)
            {
                _ = roomClient.LeaveAsync();
            }
        }

        private void BuildLobby()
        {
            var canvas = GetComponentInChildren<Canvas>();
            panel = CreatePanel("Lobby overlay", canvas.transform, new Color(0.045f, 0.035f, 0.025f, 0.94f), new Vector2(0.5f, 0.50f), new Vector2(410f, 400f));
            var title = CreateText(panel.transform, "Join the table", 34, FontStyle.Bold, new Color(1f, 0.79f, 0.40f, 1f), TextAnchor.MiddleCenter);
            Position(title.rectTransform, new Vector2(0.5f, 0.86f), new Vector2(350f, 52f));
            var subtitle = CreateText(panel.transform, "Create a fresh room or enter a friend’s code.", 16, FontStyle.Normal, new Color(0.92f, 0.85f, 0.72f, 1f), TextAnchor.MiddleCenter);
            Position(subtitle.rectTransform, new Vector2(0.5f, 0.77f), new Vector2(350f, 46f));

            nameInput = CreateInput(panel.transform, "Your trail name", new Vector2(0.5f, 0.64f));
            nameInput.text = "Player";
            codeInput = CreateInput(panel.transform, "Room code (for join)", new Vector2(0.5f, 0.50f));
            createButton = CreateButton(panel.transform, "Create room", new Vector2(0.30f, 0.35f), new Color(0.08f, 0.42f, 0.21f, 1f));
            joinButton = CreateButton(panel.transform, "Join room", new Vector2(0.70f, 0.35f), new Color(0.08f, 0.29f, 0.48f, 1f));
            createButton.onClick.AddListener(CreateRoom);
            joinButton.onClick.AddListener(JoinRoom);
            status = CreateText(panel.transform, "", 16, FontStyle.Italic, new Color(0.95f, 0.73f, 0.36f, 1f), TextAnchor.MiddleCenter);
            Position(status.rectTransform, new Vector2(0.5f, 0.23f), new Vector2(360f, 38f));
            roster = CreateText(panel.transform, "", 16, FontStyle.Normal, Color.white, TextAnchor.UpperLeft);
            Position(roster.rectTransform, new Vector2(0.5f, 0.12f), new Vector2(340f, 75f));
            startButton = CreateButton(panel.transform, "Start game", new Vector2(0.5f, 0.04f), new Color(0.49f, 0.20f, 0.66f, 1f));
            startButton.onClick.AddListener(StartGame);
            startButton.gameObject.SetActive(false);
        }

        private async void CreateRoom()
        {
            await Connect("Creating your table…");
        }

        private async void JoinRoom()
        {
            var code = codeInput.text.Trim();
            if (string.IsNullOrWhiteSpace(code))
            {
                status.text = "Enter a room code first.";
                return;
            }

            await Connect("Joining table " + code.ToUpperInvariant() + "…");
        }

        private async void StartGame()
        {
            if (roomClient == null)
            {
                return;
            }

            await Send("Asking the host to start…", roomClient.StartAsync());
        }

        private async Task Connect(string message)
        {
            SetBusy(message, true);
            roomClient = new CactusRoomClient(CactusEndpoint.LocalDefault);
            try
            {
                // Use the instance held by this controller; the operation delegate is
                // supplied after construction to keep error handling in one place.
                if (message.StartsWith("Creating", StringComparison.Ordinal))
                {
                    await roomClient.CreateAsync(SafeName(), "sage");
                }
                else
                {
                    await roomClient.JoinAsync(codeInput.text.Trim(), SafeName(), "dusty");
                }
                status.text = "Connected. Waiting for other players…";
            }
            catch (Exception error)
            {
                roomClient = null;
                status.text = "Couldn’t connect: " + error.GetBaseException().Message;
            }
            finally
            {
                SetBusy(status.text, false);
            }
        }

        private async Task Send(string message, Task operation)
        {
            status.text = message;
            try
            {
                await operation;
            }
            catch (Exception error)
            {
                status.text = error.GetBaseException().Message;
            }
        }

        private void RenderLobby()
        {
            displayedLobby = roomClient.Lobby;
            codeInput.text = displayedLobby.roomId;
            var lines = "Room " + displayedLobby.roomId + "\n";
            foreach (var player in displayedLobby.players)
            {
                lines += "• " + player.name + (player.sessionId == displayedLobby.hostSessionId ? "  ♛" : "") + "\n";
            }
            roster.text = lines;
            startButton.gameObject.SetActive(roomClient.SessionId == displayedLobby.hostSessionId && displayedLobby.players.Count >= 2);
        }

        private void SetBusy(string message, bool busy)
        {
            status.text = message;
            createButton.interactable = !busy;
            joinButton.interactable = !busy;
        }

        private string SafeName()
        {
            return string.IsNullOrWhiteSpace(nameInput.text) ? "Player" : nameInput.text.Trim();
        }

        private static GameObject CreatePanel(string name, Transform parent, Color color, Vector2 anchor, Vector2 size)
        {
            var target = new GameObject(name, typeof(RectTransform), typeof(Image));
            target.transform.SetParent(parent, false);
            target.GetComponent<Image>().color = color;
            Position(target.GetComponent<RectTransform>(), anchor, size);
            return target;
        }

        private static Text CreateText(Transform parent, string value, int fontSize, FontStyle style, Color color, TextAnchor alignment)
        {
            var target = new GameObject("Text", typeof(RectTransform), typeof(Text));
            target.transform.SetParent(parent, false);
            var text = target.GetComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.text = value;
            text.fontSize = fontSize;
            text.fontStyle = style;
            text.color = color;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            return text;
        }

        private static InputField CreateInput(Transform parent, string placeholder, Vector2 anchor)
        {
            var target = CreatePanel("Input " + placeholder, parent, new Color(0.12f, 0.10f, 0.07f, 1f), anchor, new Vector2(350f, 46f));
            var input = target.AddComponent<InputField>();
            var text = CreateText(target.transform, "", 18, FontStyle.Normal, Color.white, TextAnchor.MiddleLeft);
            Stretch(text.rectTransform, new Vector2(14f, 0f), new Vector2(-14f, 0f));
            input.textComponent = text;
            var hint = CreateText(target.transform, placeholder, 18, FontStyle.Italic, new Color(0.68f, 0.61f, 0.50f, 1f), TextAnchor.MiddleLeft);
            Stretch(hint.rectTransform, new Vector2(14f, 0f), new Vector2(-14f, 0f));
            input.placeholder = hint;
            return input;
        }

        private static Button CreateButton(Transform parent, string label, Vector2 anchor, Color color)
        {
            var target = CreatePanel(label, parent, color, anchor, new Vector2(160f, 48f));
            var button = target.AddComponent<Button>();
            var text = CreateText(target.transform, label, 18, FontStyle.Bold, Color.white, TextAnchor.MiddleCenter);
            Stretch(text.rectTransform, Vector2.zero, Vector2.zero);
            return button;
        }

        private static void Position(RectTransform rect, Vector2 anchor, Vector2 size)
        {
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = Vector2.zero;
        }

        private static void Stretch(RectTransform rect, Vector2 offsetMin, Vector2 offsetMax)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
        }
    }
}
