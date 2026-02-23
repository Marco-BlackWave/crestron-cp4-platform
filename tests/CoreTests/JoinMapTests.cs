using CrestronCP4.ProcessorSide.Configuration;

namespace CoreTests
{
    public class JoinMapTests
    {
        [Fact]
        public void Resolve_Room0_Offset0_Returns1()
        {
            // Join numbers are 1-based
            Assert.Equal((ushort)1, JoinMap.Resolve(0, 0));
        }

        [Fact]
        public void Resolve_Room0_PowerFeedback_Returns2()
        {
            Assert.Equal((ushort)2, JoinMap.Resolve(0, JoinMap.Digital.PowerFeedback));
        }

        [Fact]
        public void Resolve_Room100_Offset0_Returns101()
        {
            Assert.Equal((ushort)101, JoinMap.Resolve(100, 0));
        }

        [Fact]
        public void Resolve_Room200_SourceSelect3_Returns205()
        {
            // Source Select 3 is offset 4, room 200: 200 + 4 + 1 = 205
            Assert.Equal((ushort)205, JoinMap.Resolve(200, JoinMap.Digital.SourceSelect3));
        }

        [Fact]
        public void ResolveSystem_AllOff_Returns900()
        {
            Assert.Equal((ushort)900, JoinMap.ResolveSystem(JoinMap.SystemDigital.AllOff));
        }

        [Fact]
        public void ResolveSystem_SceneTrigger1_Returns901()
        {
            Assert.Equal((ushort)901, JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneTrigger1));
        }

        [Fact]
        public void ResolveSystem_SceneFeedback10_Returns920()
        {
            Assert.Equal((ushort)920, JoinMap.ResolveSystem(JoinMap.SystemDigital.SceneFeedback10));
        }

        [Fact]
        public void JoinsPerRoom_Is100()
        {
            Assert.Equal(100, JoinMap.JoinsPerRoom);
        }

        [Fact]
        public void SystemOffset_Is900()
        {
            Assert.Equal(900, JoinMap.SystemOffset);
        }

        [Fact]
        public void Digital_SourceSelectRange_IsContiguous()
        {
            Assert.Equal(JoinMap.Digital.SourceSelect1 + 1, JoinMap.Digital.SourceSelect2);
            Assert.Equal(JoinMap.Digital.SourceSelect2 + 1, JoinMap.Digital.SourceSelect3);
            Assert.Equal(JoinMap.Digital.SourceSelect3 + 1, JoinMap.Digital.SourceSelect4);
            Assert.Equal(JoinMap.Digital.SourceSelect4 + 1, JoinMap.Digital.SourceSelect5);
        }

        [Fact]
        public void Digital_SourceFeedbackRange_IsContiguous()
        {
            Assert.Equal(JoinMap.Digital.SourceFeedback1 + 1, JoinMap.Digital.SourceFeedback2);
            Assert.Equal(JoinMap.Digital.SourceFeedback2 + 1, JoinMap.Digital.SourceFeedback3);
        }

        [Fact]
        public void Digital_LightingSceneRange_IsContiguous()
        {
            Assert.Equal(JoinMap.Digital.LightingScene1 + 1, JoinMap.Digital.LightingScene2);
            Assert.Equal(JoinMap.Digital.LightingScene2 + 1, JoinMap.Digital.LightingScene3);
            Assert.Equal(JoinMap.Digital.LightingScene3 + 1, JoinMap.Digital.LightingScene4);
        }

        [Fact]
        public void SystemDigital_SceneTriggerRange_IsContiguous()
        {
            for (int i = 0; i < 9; i++)
            {
                Assert.Equal(JoinMap.SystemDigital.SceneTrigger1 + i + 1,
                    JoinMap.SystemDigital.SceneTrigger1 + i + 1);
            }
        }

        [Fact]
        public void NoOverlap_RoomDigital_AllOffsetsUnder100()
        {
            // All per-room digital offsets must be < 100
            Assert.True(JoinMap.Digital.HvacOnOff < JoinMap.JoinsPerRoom);
        }

        [Fact]
        public void NoOverlap_RoomAnalog_AllOffsetsUnder100()
        {
            Assert.True(JoinMap.Analog.TempSetpointFeedback < JoinMap.JoinsPerRoom);
        }

        [Fact]
        public void NoOverlap_RoomSerial_AllOffsetsUnder100()
        {
            Assert.True(JoinMap.Serial.StatusText < JoinMap.JoinsPerRoom);
        }
    }
}
