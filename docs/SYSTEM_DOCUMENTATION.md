# Murder Mystery Pipeline System Documentation

## Overview

This document describes the architecture and operation of the Murder Mystery Node.js POC application. The system generates murder mystery game cards through a pipeline of specialized AI agents that work together to create a complete mystery experience.

## Architecture

The system follows a modular architecture with the following key components:

### 1. Pipeline Structure
The core of the system is a pipeline of 18 specialized agents that process the mystery generation in sequence:

- **Truth-aware agents** (receive full solutions and true narratives):
  - story_blurb_agent
  - solution_agent
  - breadcrumb_trail_agent
  - trail_review_agent
  - narrative_generator_agent
  - narrative_validator_agent
  - trail_balance_validator_agent
  - solvability_validator_agent

- **Truth-blind agents** (work with sealed context only):
  - story_acts_agent
  - host_speech_agent
  - character_profile_agent
  - character_secret_agent
  - clue_agent
  - item_agent
  - puzzle_agent
  - player_activity_agent
  - game_card_agent
  - card_quality_agent
  - final_editor_agent

### 2. Core Components

#### Pipeline Execution
The pipeline execution is managed by:
- `src/queue/Worker.js` - Executes the pipeline steps sequentially
- `src/queue/Queue.js` - Manages job queue and job lifecycle

#### Agents
Each step in the pipeline is implemented as an agent in the `src/agents/` directory. Agents are specialized functions that take a context and return an updated context with generated content.

#### Storage and Output
- `src/storage/` - Handles job persistence and output generation
- `src/storage/store.js` - Manages job state persistence
- `src/storage/runDir.js` - Manages run directories and output paths

#### CLI Interface
- `src/cli.js` - Command-line interface for controlling the pipeline
- `src/cli/logger.js` - Logging and status reporting utilities

### 3. Execution Flow

The execution flow works as follows:

1. **Initialization**: 
   - User provides a prompt and player count
   - A new run directory is created
   - A job is created in the queue with initial context

2. **Pipeline Execution**:
   - The worker processes each step in sequence
   - Each agent modifies the shared context
   - Context is saved after each step for persistence
   - Progress is reported to the user

3. **Completion**:
   - All steps complete successfully
   - Final output is written to the run directory
   - Job status is marked as "done"

### 4. Key Features

#### Context Management
- Shared context is passed between all agents
- Context is persisted after each step for fault tolerance
- Context includes run information, player count, and generated content

#### Error Handling
- Each step runs in a try-catch block
- Errors are logged and stored in the job
- Job state is persisted even when errors occur
- Execution can be resumed from where it left off

#### Progress Tracking
- Real-time step-by-step progress reporting
- Clear indication of which step is currently running
- Visual feedback for completed and failed steps

#### Persistence
- Jobs are stored in memory and persisted to disk
- Can resume interrupted jobs
- Run directories contain all output files

### 5. Pipeline Steps

The pipeline consists of 18 steps that work together to create a complete mystery:

1. **story_blurb_agent** - Generates the initial mystery setup
2. **solution_agent** - Creates the complete solution including killer, method, and motive
3. **breadcrumb_trail_agent** - Creates the trail of clues leading to the solution
4. **trail_review_agent** - Reviews and refines the clue trail
5. **narrative_generator_agent** - Creates the narrative structure
6. **narrative_validator_agent** - Validates the narrative for consistency
7. **trail_balance_validator_agent** - Ensures the clue trail is balanced and solvable
8. **story_acts_agent** - Creates the story acts and structure
9. **host_speech_agent** - Generates the host's speech for the game
10. **character_profile_agent** - Creates character profiles
11. **character_secret_agent** - Generates character secrets
12. **clue_agent** - Creates individual clues
13. **item_agent** - Generates items for the mystery
14. **puzzle_agent** - Creates puzzles for the players
15. **player_activity_agent** - Generates player activity content
16. **game_card_agent** - Creates the final game cards
17. **card_quality_agent** - Reviews and improves card quality
18. **final_editor_agent** - Final editing and formatting
19. **solvability_validator_agent** - Validates the overall solvability of the mystery

### 6. Command Line Interface

The application is controlled through the command line:

```
Commands:
  node src/cli.js start "<prompt>" <players>
  node src/cli.js status
  node src/cli.js resume
  node src/cli.js reset
```

#### Usage Examples:
```
# Start a new mystery with 4 players
node src/cli.js start "Whimsical mansion murder with a missing fortune" 4

# Check job status
node src/cli.js status

# Resume interrupted jobs
node src/cli.js resume

# Reset job storage
node src/cli.js reset
```

### 7. Environment Setup

The application requires an `.env` file with:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### 8. Storage Structure

The system creates a dedicated run directory for each execution with:
- Job state persistence
- Generated output files
- Log information
- Intermediate step results

### 9. Fault Tolerance

The system provides several fault tolerance mechanisms:
- Job persistence after each step
- Ability to resume interrupted jobs
- Detailed error logging
- State tracking for all jobs
- Clean recovery from failures

## Future Enhancements

Based on the orchestrator proposal, potential enhancements include:
- Parallel execution of independent steps
- Enhanced workflow management with YAML definitions
- Advanced monitoring and observability
- Better error recovery and retry mechanisms
- Dashboard visualization of pipeline execution