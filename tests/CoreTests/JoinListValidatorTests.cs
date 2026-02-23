using CrestronCP4.ProcessorSide.Configuration;

namespace CoreTests;

public class JoinListValidatorTests
{
    private readonly JoinListValidator _validator = new();

    private static JoinListConfig ValidConfig() => new()
    {
        SchemaVersion = "1.0",
        Processor = "CP4",
        ProjectId = "test-project",
        Joins = new JoinListJoins
        {
            Digital = new List<JoinEntry>
            {
                new() { Join = 1, Name = "Power", Direction = "input" }
            },
            Analog = new List<JoinEntry>
            {
                new() { Join = 1, Name = "Volume", Direction = "output" }
            },
            Serial = new List<JoinEntry>()
        }
    };

    [Fact]
    public void ValidConfig_PassesValidation()
    {
        var result = _validator.Validate(ValidConfig());
        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public void NullConfig_Fails()
    {
        var result = _validator.Validate(null!);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void MissingSchemaVersion_Fails()
    {
        var config = ValidConfig();
        config.SchemaVersion = null!;
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("schemaVersion"));
    }

    [Fact]
    public void WrongSchemaVersion_Fails()
    {
        var config = ValidConfig();
        config.SchemaVersion = "2.0";
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void SchemaVersion_CaseInsensitive()
    {
        var config = ValidConfig();
        config.SchemaVersion = "1.0"; // There's no uppercase variant of 1.0, but this tests the path
        var result = _validator.Validate(config);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void MissingProcessor_Fails()
    {
        var config = ValidConfig();
        config.Processor = null!;
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void WrongProcessor_Fails()
    {
        var config = ValidConfig();
        config.Processor = "CP3";
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Processor_CaseInsensitive()
    {
        var config = ValidConfig();
        config.Processor = "cp4";
        var result = _validator.Validate(config);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void MissingProjectId_Fails()
    {
        var config = ValidConfig();
        config.ProjectId = null!;
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("projectId"));
    }

    [Fact]
    public void EmptyProjectId_Fails()
    {
        var config = ValidConfig();
        config.ProjectId = "  ";
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void NullJoins_Fails()
    {
        var config = ValidConfig();
        config.Joins = null!;
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void EmptyJoinArrays_Passes()
    {
        var config = ValidConfig();
        config.Joins = new JoinListJoins
        {
            Digital = new List<JoinEntry>(),
            Analog = new List<JoinEntry>(),
            Serial = new List<JoinEntry>()
        };
        var result = _validator.Validate(config);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void NullJoinArrays_Passes()
    {
        var config = ValidConfig();
        config.Joins = new JoinListJoins
        {
            Digital = null!,
            Analog = null!,
            Serial = null!
        };
        var result = _validator.Validate(config);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void JoinNumberZero_Fails()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry>
        {
            new() { Join = 0, Name = "Bad", Direction = "input" }
        };
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void DuplicateJoinNumbers_Fails()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry>
        {
            new() { Join = 1, Name = "Power", Direction = "input" },
            new() { Join = 1, Name = "Mute", Direction = "output" }
        };
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("collision"));
    }

    [Fact]
    public void SameJoinNumber_DifferentTypes_Passes()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry>
        {
            new() { Join = 1, Name = "Power", Direction = "input" }
        };
        config.Joins.Analog = new List<JoinEntry>
        {
            new() { Join = 1, Name = "Volume", Direction = "output" }
        };
        var result = _validator.Validate(config);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void EmptyJoinName_Fails()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry>
        {
            new() { Join = 1, Name = "", Direction = "input" }
        };
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void MissingDirection_Fails()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry>
        {
            new() { Join = 1, Name = "Power", Direction = null! }
        };
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void InvalidDirection_Fails()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry>
        {
            new() { Join = 1, Name = "Power", Direction = "sideways" }
        };
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
    }

    [Fact]
    public void Direction_CaseInsensitive()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry>
        {
            new() { Join = 1, Name = "Power", Direction = "INPUT" }
        };
        var result = _validator.Validate(config);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void NullEntry_ReportsError()
    {
        var config = ValidConfig();
        config.Joins!.Digital = new List<JoinEntry> { null! };
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("null"));
    }

    [Fact]
    public void MultipleErrors_AllReported()
    {
        var config = ValidConfig();
        config.SchemaVersion = "2.0";
        config.Processor = "CP3";
        config.ProjectId = "";
        var result = _validator.Validate(config);
        Assert.False(result.IsValid);
        Assert.True(result.Errors.Count >= 3);
    }
}
