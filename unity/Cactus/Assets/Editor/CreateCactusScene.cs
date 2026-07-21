using Cactus.Presentation;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Cactus.Editor
{
    public static class CreateCactusScene
    {
        public static void Run()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var root = new GameObject("Cactus App", typeof(CactusTableBackdrop), typeof(CactusLobbyController), typeof(CactusBoardPresenter), typeof(CactusActionHud));
            EditorSceneManager.SaveScene(scene, "Assets/Scenes/CactusTable.unity");
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene("Assets/Scenes/CactusTable.unity", true)
            };
            AssetDatabase.SaveAssets();
        }
    }
}
