using System;
using Cactus.Network;
using UnityEngine;
using UnityEngine.UI;

namespace Cactus.Presentation
{
    public sealed class CactusActionHud : MonoBehaviour
    {
        private CactusLobbyController lobby;
        private Text status;
        private Text turn;
        private string lastPhase;

        private void Start()
        {
            lobby = GetComponent<CactusLobbyController>();
            var canvas = GetComponentInChildren<Canvas>();
            var layer = new GameObject("Action HUD", typeof(RectTransform)).transform;
            layer.SetParent(canvas.transform, false);
            AddButton(layer, "🂠  Draw Deck", new Vector2(0.37f, 0.17f), new Color(0.04f, 0.37f, 0.61f, 1f), Draw);
            AddButton(layer, "⇧  Take Discard", new Vector2(0.52f, 0.17f), new Color(0.16f, 0.48f, 0.11f, 1f), TakeDiscard);
            AddButton(layer, "🌵  Call Cactus", new Vector2(0.67f, 0.17f), new Color(0.42f, 0.14f, 0.60f, 1f), Call);
            var panel = Panel(layer, "Turn panel", new Vector2(0.86f, 0.22f), new Vector2(300f, 142f), new Color(0.045f, 0.035f, 0.025f, .93f));
            turn = Text(panel.transform, "YOUR TURN", 23, new Color(1f, .72f, .28f, 1f), TextAnchor.UpperLeft); Place(turn.rectTransform, new Vector2(.08f,.76f), new Vector2(250f,35f));
            status = Text(panel.transform, "Choose an action.\nDraw a card or take the discard.", 16, new Color(.94f,.88f,.76f,1f), TextAnchor.UpperLeft); Place(status.rectTransform, new Vector2(.08f,.38f), new Vector2(255f,75f));
        }

        private void Update()
        {
            var view = lobby.RoomClient == null ? null : lobby.RoomClient.View;
            if (view == null || view.phase == lastPhase) return;
            lastPhase = view.phase;
            turn.text = view.phase == "peek" ? "PEEK AT YOUR CARDS" : view.currentPlayerId == view.you ? "YOUR TURN" : "WAITING FOR TURN";
            status.text = view.phase == "peek" ? "Memorize your two bottom cards. They will turn face-down when the timer ends." : view.currentPlayerId == view.you ? "Choose an action." : "Watch the table and plan your move.";
        }

        private async void Draw() => await Send(() => lobby.RoomClient.DrawDeckAsync(), "Drawing from the deck…");
        private async void TakeDiscard()
        {
            var view = lobby.RoomClient == null ? null : lobby.RoomClient.View;
            var player = view == null || view.players == null ? null : view.players.Find(item => item.id == view.you);
            if (player == null || player.board == null || player.board.Count == 0) { status.text = "Your board is not ready yet."; return; }
            await Send(() => lobby.RoomClient.DrawDiscardAsync(player.board[0].slotId), "Taking the discard into your first slot…");
        }
        private async void Call() => await Send(() => lobby.RoomClient.CallCactusAsync(), "Calling Cactus…");
        private async System.Threading.Tasks.Task Send(Func<System.Threading.Tasks.Task> action, string message)
        {
            if (lobby.RoomClient == null) { status.text = "Join a room first."; return; }
            status.text = message;
            try { await action(); } catch (Exception error) { status.text = error.GetBaseException().Message; }
        }

        private static void AddButton(Transform parent, string label, Vector2 a, Color c, UnityEngine.Events.UnityAction call)
        { var p=Panel(parent,label,a,new Vector2(210f,62f),c); var b=p.AddComponent<Button>(); b.onClick.AddListener(call); var t=Text(p.transform,label,20,Color.white,TextAnchor.MiddleCenter); Stretch(t.rectTransform); }
        private static GameObject Panel(Transform p,string n,Vector2 a,Vector2 s,Color c)
        { var o=new GameObject(n,typeof(RectTransform),typeof(Image));o.transform.SetParent(p,false);o.GetComponent<Image>().color=c;Place(o.GetComponent<RectTransform>(),a,s);return o; }
        private static Text Text(Transform p,string v,int s,Color c,TextAnchor align)
        {var o=new GameObject("Text",typeof(RectTransform),typeof(Text));o.transform.SetParent(p,false);var t=o.GetComponent<Text>();t.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");t.text=v;t.fontSize=s;t.fontStyle=FontStyle.Bold;t.color=c;t.alignment=align;t.horizontalOverflow=HorizontalWrapMode.Wrap;return t;}
        private static void Place(RectTransform r,Vector2 a,Vector2 s){r.anchorMin=r.anchorMax=a;r.sizeDelta=s;r.anchoredPosition=Vector2.zero;}
        private static void Stretch(RectTransform r){r.anchorMin=Vector2.zero;r.anchorMax=Vector2.one;r.offsetMin=r.offsetMax=Vector2.zero;}
    }
}
