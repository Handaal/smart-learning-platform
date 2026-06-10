# Doctoral Core Architecture

This platform is implemented as a layered adaptive training environment for the PhD study on facial-emotion-aware development of instructional design project-management skills.

## Core constraint

- Facial expression sensing from webcam only
- No voice emotion analysis in the doctoral core
- No eye tracking, wearable, EEG, GSR, or heart-rate dependency in the doctoral core

## Runtime layers

### Sensor layer

- Browser webcam capture
- Face detection and expression inference through `face-api`
- Confidence scoring and timestamped facial signal payloads
- No raw video persistence

### AI / adaptive engine layer

- Receives facial emotion events and behavior windows through WebSocket
- Reads live emotion, engagement, context, performance, and intervention state from Redis
- Applies interpretable scenario rules for boredom, frustration, confusion, focused engagement, and distraction
- Persists every adaptive decision, including monitor-only states, for research audit

### Content layer

- Scenario-centered learner activity renderer
- Adaptive content selection by tag, scaffold level, and rule match
- Supportive, clarification, engagement, and challenge variants

### Learning analytics layer

- Session emotion timeline
- Emotional engagement heatmap
- Intervention effectiveness tables
- Research exports for downstream statistical analysis

### Content management and research control hub

- Course hierarchy builder
- Adaptive content mapping
- Scenario control cards and live preview simulation
- Default doctoral session flow model

## Default session flow

1. Login and informed consent
2. Pre-test
3. Initial adjustment and personalization
4. Emotion sensing activation
5. Problem scenario entry
6. Adaptive learning activities
7. Post-test
8. Completion

## Research logging expectations

Every adaptive decision should capture:

- `participantId`
- `sessionId`
- detected emotion
- confidence
- matched scenario
- lesson or activity context
- chosen adaptive action
- learner state after action
- affective feedback loop snapshot

## Research data model extensions

The doctoral schema now includes dedicated research-control entities in addition to the legacy learning tables:

- `adaptive_tag`, `scenario_rule`, and `scenario_action` for interpretable authoring logic
- `engagement_snapshot`, `intervention_log`, `activity_log`, and `timeline_heatmap` for analysis-ready event capture
- `assessment_attempt`, `badge`, `admin_simulation`, and `research_export` for operational research support
- plural compatibility views such as `participants`, `lessons`, `lesson_contents`, `pretests`, and `posttests` so exports can align with the dissertation terminology without breaking existing runtime tables
