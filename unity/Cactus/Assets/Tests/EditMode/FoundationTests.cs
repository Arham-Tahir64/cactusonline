using NUnit.Framework;
using UnityEngine;

namespace Cactus.Tests
{
    public sealed class FoundationTests
    {
        [Test]
        public void ProjectUsesThePinnedUnityEditor()
        {
            StringAssert.StartsWith("6000.5.4f1", Application.unityVersion);
        }
    }
}
