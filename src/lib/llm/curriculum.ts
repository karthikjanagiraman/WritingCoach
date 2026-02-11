import type { Lesson, Tier, WritingType } from "@/types";

// ---------------------------------------------------------------------------
// Curriculum data — structured lesson catalog
// Complete curriculum covering all four writing types across three tiers.
// ---------------------------------------------------------------------------

const lessons: Lesson[] = [
  // =========================================================================
  // NARRATIVE WRITING
  // =========================================================================

  // -------------------------------------------------------------------------
  // TIER 1 — NARRATIVE (Ages 7-9)
  // -------------------------------------------------------------------------

  // Unit N1.1: Story Beginnings
  {
    id: "N1.1.1",
    title: "What Makes a Good Story?",
    unit: "Story Beginnings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Identify that stories have a beginning, middle, and end",
      "Recognize what makes a story interesting to read",
    ],
  },
  {
    id: "N1.1.2",
    title: "Meeting the Character",
    unit: "Story Beginnings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Introduce a main character with a name",
      "Tell one interesting thing about the character",
    ],
  },
  {
    id: "N1.1.3",
    title: "Where Does It Happen?",
    unit: "Story Beginnings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Describe the setting using at least one detail",
      "Help the reader picture where the story takes place",
    ],
  },
  {
    id: "N1.1.4",
    title: "Grabbing the Reader",
    unit: "Story Beginnings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write an opening sentence that makes readers curious",
      "Understand what a 'hook' is in writing",
    ],
  },
  {
    id: "N1.1.5",
    title: "Write a Story Beginning",
    unit: "Story Beginnings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write a complete story beginning with a character, setting, and hook",
      "Combine the skills from previous lessons into one piece",
    ],
    rubricId: "N1_story_beginning",
  },

  // Unit N1.2: Story Middles
  {
    id: "N1.2.1",
    title: "What Happens Next?",
    unit: "Story Middles",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write events in the order they happen",
      "Use time-order words (first, then, next)",
    ],
  },
  {
    id: "N1.2.2",
    title: "Oh No! The Problem",
    unit: "Story Middles",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Create a problem or challenge for the character",
      "Make the problem interesting for readers",
    ],
  },
  {
    id: "N1.2.3",
    title: "How Does the Character Feel?",
    unit: "Story Middles",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Show character feelings through actions or words",
      "Use feeling words in writing",
    ],
  },
  {
    id: "N1.2.4",
    title: "Adding More Events",
    unit: "Story Middles",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write multiple events that connect to each other",
      "Keep the story moving forward",
    ],
  },
  {
    id: "N1.2.5",
    title: "Write a Story Middle",
    unit: "Story Middles",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write a story middle with ordered events and a problem",
      "Combine sequencing, problem creation, and character feelings",
    ],
    rubricId: "N1_story_middle",
  },

  // Unit N1.3: Story Endings
  {
    id: "N1.3.1",
    title: "Solving the Problem",
    unit: "Story Endings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write an ending that solves the character's problem",
      "Make the solution make sense for the story",
    ],
  },
  {
    id: "N1.3.2",
    title: "How Does It End?",
    unit: "Story Endings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write an ending that feels complete",
      "Show how the character feels at the end",
    ],
  },
  {
    id: "N1.3.3",
    title: "Surprise Endings",
    unit: "Story Endings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Explore different types of endings",
      "Write an ending that surprises the reader",
    ],
  },
  {
    id: "N1.3.4",
    title: "Practice Endings",
    unit: "Story Endings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write different endings for the same story",
      "Choose the best ending and explain why",
    ],
  },
  {
    id: "N1.3.5",
    title: "Write a Story Ending",
    unit: "Story Endings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write a satisfying story ending with a resolution",
      "Show the character's reaction to the resolution",
    ],
    rubricId: "N1_story_ending",
  },

  // Unit N1.4: Sensory Details
  {
    id: "N1.4.1",
    title: "See It, Hear It, Feel It",
    unit: "Sensory Details",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Identify the five senses",
      "Find sensory details in example writing",
    ],
  },
  {
    id: "N1.4.2",
    title: "Painting with Words",
    unit: "Sensory Details",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Replace vague words with specific sensory words",
      "Use at least two different senses in writing",
    ],
  },
  {
    id: "N1.4.3",
    title: "Making Descriptions Pop",
    unit: "Sensory Details",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write a short description using three or more senses",
      "Choose details that matter to the story",
    ],
  },
  {
    id: "N1.4.4",
    title: "Details in Stories",
    unit: "Sensory Details",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Add sensory details to an existing story passage",
      "Understand how details make stories better",
    ],
  },
  {
    id: "N1.4.5",
    title: "Write a Sensory Description",
    unit: "Sensory Details",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write a vivid description using multiple senses",
      "Use specific, interesting word choices",
    ],
    rubricId: "N1_sensory_description",
  },

  // Unit N1.5: Characters with Feelings
  {
    id: "N1.5.1",
    title: "How Do Characters Feel?",
    unit: "Characters with Feelings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Identify emotions in story excerpts",
      "Name different feelings characters can have",
    ],
  },
  {
    id: "N1.5.2",
    title: "Showing Feelings Through Actions",
    unit: "Characters with Feelings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Show character emotions through behavior instead of telling",
      "Transform 'telling' sentences into 'showing' sentences",
    ],
  },
  {
    id: "N1.5.3",
    title: "What Characters Say",
    unit: "Characters with Feelings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write dialogue that shows how a character feels",
      "Use words and tone to express emotion",
    ],
  },
  {
    id: "N1.5.4",
    title: "Feelings Change",
    unit: "Characters with Feelings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Track how a character's emotions change in a story",
      "Show a character going from one feeling to another",
    ],
  },
  {
    id: "N1.5.5",
    title: "My Emotional Character",
    unit: "Characters with Feelings",
    type: "narrative",
    tier: 1,
    learningObjectives: [
      "Write a scene where a character feels and reacts to events",
      "Demonstrate showing emotions through actions, words, and thoughts",
    ],
    rubricId: "N1_complete_story",
  },

  // -------------------------------------------------------------------------
  // TIER 2 — NARRATIVE (Ages 10-12)
  // -------------------------------------------------------------------------

  // Unit N2.1: Story Structure — The Story Mountain
  {
    id: "N2.1.1",
    title: "The Story Mountain",
    unit: "Story Structure",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Identify the parts of a story mountain: exposition, rising action, climax, falling action, resolution",
      "Map an existing story onto the story mountain",
    ],
  },
  {
    id: "N2.1.2",
    title: "Exposition — Setting the Stage",
    unit: "Story Structure",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Write exposition that hooks readers and provides necessary background",
      "Introduce characters, setting, and initial situation effectively",
    ],
  },
  {
    id: "N2.1.3",
    title: "Rising Action — Building Tension",
    unit: "Story Structure",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Add complications that increase the stakes for the character",
      "Build tension progressively through a sequence of events",
    ],
  },
  {
    id: "N2.1.4",
    title: "Climax — The Turning Point",
    unit: "Story Structure",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Identify what makes an effective climax in a story",
      "Write a climax that feels like the most exciting or important moment",
    ],
  },
  {
    id: "N2.1.5",
    title: "Falling Action and Resolution",
    unit: "Story Structure",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Write falling action that winds down the tension naturally",
      "Bring stories to satisfying conclusions that resolve the conflict",
    ],
  },
  {
    id: "N2.1.6",
    title: "Build a Story Mountain",
    unit: "Story Structure",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Write a complete story following the story mountain structure",
      "Include rising tension that builds to a clear climax",
    ],
    rubricId: "N2_story_structure",
  },

  // Unit N2.2: Point of View
  {
    id: "N2.2.1",
    title: "Who Is Telling the Story?",
    unit: "Point of View",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Identify first person, third person limited, and third person omniscient POV",
      "Recognize POV in excerpts from published stories",
    ],
  },
  {
    id: "N2.2.2",
    title: "First Person — 'I' Stories",
    unit: "Point of View",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Write a scene in first person point of view",
      "Use first person to reveal character thoughts and feelings directly",
    ],
  },
  {
    id: "N2.2.3",
    title: "Third Person Limited",
    unit: "Point of View",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Rewrite a scene in third person limited point of view",
      "Show one character's thoughts while keeping others' hidden",
    ],
  },
  {
    id: "N2.2.4",
    title: "Third Person Omniscient",
    unit: "Point of View",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Explore telling a story while knowing all characters' thoughts",
      "Practice revealing multiple perspectives in a scene",
    ],
  },
  {
    id: "N2.2.5",
    title: "POV Consistency",
    unit: "Point of View",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Identify and fix unintentional POV shifts in writing",
      "Write consistently in first person point of view",
    ],
  },
  {
    id: "N2.2.6",
    title: "Choosing the Right POV",
    unit: "Point of View",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Select and justify the best POV for an original story",
      "Understand how POV choice affects reader experience",
    ],
    rubricId: "N2_pov_consistency",
  },

  // Unit N2.3: Dialogue That Works
  {
    id: "N2.3.1",
    title: "Dialogue Punctuation",
    unit: "Dialogue",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Format dialogue correctly with quotation marks and commas",
      "Identify and correct punctuation errors in dialogue",
    ],
  },
  {
    id: "N2.3.2",
    title: "Said Is Not Dead (But Has Friends)",
    unit: "Dialogue",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Expand dialogue tag vocabulary beyond 'said'",
      "Choose dialogue tags that match the character's emotion",
    ],
  },
  {
    id: "N2.3.3",
    title: "Dialogue Without Tags",
    unit: "Dialogue",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Use action beats instead of dialogue tags",
      "Show who is speaking through context and actions",
    ],
  },
  {
    id: "N2.3.4",
    title: "Each Character Sounds Different",
    unit: "Dialogue",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Create distinct character voices through word choice and speech patterns",
      "Make characters recognizable by how they speak",
    ],
  },
  {
    id: "N2.3.5",
    title: "Dialogue Advances the Story",
    unit: "Dialogue",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Analyze how dialogue serves a purpose in mentor texts",
      "Write dialogue that reveals character or moves the plot forward",
    ],
  },
  {
    id: "N2.3.6",
    title: "Write a Dialogue Scene",
    unit: "Dialogue",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Write a scene using correctly punctuated dialogue",
      "Give characters distinct voices",
    ],
    rubricId: "N2_dialogue_scene",
  },

  // Unit N2.4: Show, Don't Tell — Advanced
  {
    id: "N2.4.1",
    title: "Body Language Tells All",
    unit: "Show Don't Tell",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Replace emotion words with physical descriptions and body language",
      "Show how characters feel through what they do",
    ],
  },
  {
    id: "N2.4.2",
    title: "Similes That Show",
    unit: "Show Don't Tell",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Create original similes to describe feelings and settings",
      "Use comparisons to paint vivid pictures for the reader",
    ],
  },
  {
    id: "N2.4.3",
    title: "Metaphors That Illuminate",
    unit: "Show Don't Tell",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Use metaphors to deepen description and meaning",
      "Understand the difference between simile and metaphor",
    ],
  },
  {
    id: "N2.4.4",
    title: "When to Tell",
    unit: "Show Don't Tell",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Identify moments where telling is more appropriate than showing",
      "Balance showing with necessary telling for pacing",
    ],
  },
  {
    id: "N2.4.5",
    title: "Show, Don't Tell",
    unit: "Show Don't Tell",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Show emotions through physical actions rather than naming them",
      "Use figurative language to create vivid scenes",
    ],
    rubricId: "N2_show_dont_tell",
  },

  // Unit N2.5: Suspense and Pacing
  {
    id: "N2.5.1",
    title: "Fast and Slow Scenes",
    unit: "Suspense and Pacing",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Analyze pacing differences in action versus reflective scenes",
      "Identify how authors control the speed of their stories",
    ],
  },
  {
    id: "N2.5.2",
    title: "Sentence Length Controls Speed",
    unit: "Suspense and Pacing",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Rewrite scenes using varied sentence length to change pacing",
      "Use short sentences for tension and longer sentences for calm",
    ],
  },
  {
    id: "N2.5.3",
    title: "Foreshadowing Hints",
    unit: "Suspense and Pacing",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Identify foreshadowing in mentor texts",
      "Create subtle hints that build anticipation for the reader",
    ],
  },
  {
    id: "N2.5.4",
    title: "Cliffhangers and Page-Turners",
    unit: "Suspense and Pacing",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Write chapter or scene endings that compel the reader to keep reading",
      "Use unanswered questions and unresolved tension effectively",
    ],
  },
  {
    id: "N2.5.5",
    title: "My Suspenseful Scene",
    unit: "Suspense and Pacing",
    type: "narrative",
    tier: 2,
    learningObjectives: [
      "Write a scene that builds and releases tension effectively",
      "Apply pacing, foreshadowing, and cliffhanger techniques",
    ],
    rubricId: "N2_suspense_pacing",
  },

  // -------------------------------------------------------------------------
  // TIER 3 — NARRATIVE (Ages 13-15)
  // -------------------------------------------------------------------------

  // Unit N3.1: Complex Narrative Structures
  {
    id: "N3.1.1",
    title: "Beyond Beginning-Middle-End",
    unit: "Complex Narrative Structures",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Analyze non-linear narrative structures (flashback, frame story, parallel timelines)",
      "Identify how structure serves meaning in published stories",
    ],
  },
  {
    id: "N3.1.2",
    title: "Flashbacks That Matter",
    unit: "Complex Narrative Structures",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write purposeful flashbacks that reveal character or advance plot",
      "Transition smoothly between past and present timelines",
    ],
  },
  {
    id: "N3.1.3",
    title: "Flash-Forwards and Foreshadowing",
    unit: "Complex Narrative Structures",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Create anticipation through glimpses of future events",
      "Use foreshadowing to build thematic resonance",
    ],
  },
  {
    id: "N3.1.4",
    title: "Parallel Storylines",
    unit: "Complex Narrative Structures",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Plan and execute dual narratives that intersect meaningfully",
      "Maintain clarity when alternating between storylines",
    ],
  },
  {
    id: "N3.1.5",
    title: "Frame Narratives",
    unit: "Complex Narrative Structures",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write a story-within-a-story using frame narrative technique",
      "Use the frame to add layers of meaning to the inner story",
    ],
  },
  {
    id: "N3.1.6",
    title: "Write a Non-Linear Story",
    unit: "Complex Narrative Structures",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write a story using a non-linear structure that serves the story's meaning",
      "Maintain reader clarity while experimenting with timeline",
    ],
    rubricId: "N3_complex_narrative",
  },

  // Unit N3.2: Voice and Style
  {
    id: "N3.2.1",
    title: "What Is Voice?",
    unit: "Voice and Style",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Identify voice characteristics in different authors' work",
      "Understand how diction, syntax, and tone create voice",
    ],
  },
  {
    id: "N3.2.2",
    title: "Finding Your Voice",
    unit: "Voice and Style",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write the same scene in different voices to explore range",
      "Begin to identify personal writing tendencies and preferences",
    ],
  },
  {
    id: "N3.2.3",
    title: "Mentor Author Study",
    unit: "Voice and Style",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Analyze the style of a favorite author in detail",
      "Identify specific techniques that create the author's signature voice",
    ],
  },
  {
    id: "N3.2.4",
    title: "Style Imitation Exercise",
    unit: "Voice and Style",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write a passage in a mentor author's style",
      "Understand how imitation builds craft awareness",
    ],
  },
  {
    id: "N3.2.5",
    title: "Style Adaptation",
    unit: "Voice and Style",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Shift style for different audiences and purposes",
      "Adapt voice while maintaining authenticity",
    ],
  },
  {
    id: "N3.2.6",
    title: "Develop Your Writer's Voice",
    unit: "Voice and Style",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write with a distinctive authorial voice",
      "Make deliberate stylistic choices that enhance meaning",
    ],
    rubricId: "N3_voice_style",
  },

  // Unit N3.3: Character Development in Depth
  {
    id: "N3.3.1",
    title: "Character Psychology",
    unit: "Character Development",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Create detailed character profiles with psychological depth",
      "Understand how backstory shapes character behavior",
    ],
  },
  {
    id: "N3.3.2",
    title: "Motivation and Desire",
    unit: "Character Development",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Define character wants versus needs",
      "Create tension between what a character pursues and what they truly need",
    ],
  },
  {
    id: "N3.3.3",
    title: "Character Flaws and Growth",
    unit: "Character Development",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Design a compelling character arc from flaw to growth",
      "Show how challenges force characters to change",
    ],
  },
  {
    id: "N3.3.4",
    title: "Internal Monologue",
    unit: "Character Development",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write a character's inner thoughts in a way that reveals depth",
      "Balance internal monologue with action and dialogue",
    ],
  },
  {
    id: "N3.3.5",
    title: "Showing Change",
    unit: "Character Development",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Demonstrate character growth through contrasting scenes",
      "Show change through actions and decisions, not just statements",
    ],
  },
  {
    id: "N3.3.6",
    title: "My Complex Character",
    unit: "Character Development",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write a character-driven story with a full character arc",
      "Integrate psychology, motivation, and growth into narrative",
    ],
    rubricId: "N3_character_development",
  },

  // Unit N3.4: Theme and Meaning
  {
    id: "N3.4.1",
    title: "Theme vs. Topic",
    unit: "Theme and Meaning",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Distinguish between a story's topic and its deeper theme",
      "Identify themes in mentor texts and explain how they emerge",
    ],
  },
  {
    id: "N3.4.2",
    title: "Theme Through Character",
    unit: "Theme and Meaning",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Show theme through character choices and consequences",
      "Let characters embody thematic ideas through action",
    ],
  },
  {
    id: "N3.4.3",
    title: "Theme Through Symbol",
    unit: "Theme and Meaning",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Use symbols and motifs to reinforce theme",
      "Develop recurring imagery that deepens meaning",
    ],
  },
  {
    id: "N3.4.4",
    title: "The Danger of Preaching",
    unit: "Theme and Meaning",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Recognize when thematic messaging becomes heavy-handed",
      "Edit for subtlety so theme emerges naturally from story",
    ],
  },
  {
    id: "N3.4.5",
    title: "Multiple Themes",
    unit: "Theme and Meaning",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Layer multiple themes within one narrative",
      "Balance primary and secondary themes without confusion",
    ],
  },
  {
    id: "N3.4.6",
    title: "Theme Through Story",
    unit: "Theme and Meaning",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Weave a meaningful theme throughout a narrative",
      "Develop thematic complexity without being heavy-handed",
    ],
    rubricId: "N3_theme_meaning",
  },

  // Unit N3.5: The Short Story — Mastery
  {
    id: "N3.5.1",
    title: "Short Story Craft",
    unit: "Revision and Polish",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Analyze award-winning short stories to identify craft elements",
      "Understand the conventions that distinguish short stories from novels",
    ],
  },
  {
    id: "N3.5.2",
    title: "Unity of Effect",
    unit: "Revision and Polish",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Create a focused, unified impact in a short story",
      "Ensure every element serves the story's central effect",
    ],
  },
  {
    id: "N3.5.3",
    title: "Opening Lines That Work",
    unit: "Revision and Polish",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Craft powerful first sentences that hook and set tone",
      "Analyze how published authors open their stories",
    ],
  },
  {
    id: "N3.5.4",
    title: "Endings That Resonate",
    unit: "Revision and Polish",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write endings that leave a lasting impression on the reader",
      "Explore different ending strategies: resolution, ambiguity, surprise",
    ],
  },
  {
    id: "N3.5.5",
    title: "The Revision Process",
    unit: "Revision and Polish",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Apply a multi-draft revision process to improve writing",
      "Give and receive constructive feedback in a workshop setting",
    ],
  },
  {
    id: "N3.5.6",
    title: "The Polished Short Story",
    unit: "Revision and Polish",
    type: "narrative",
    tier: 3,
    learningObjectives: [
      "Write and revise a complete, polished short story",
      "Demonstrate mastery of narrative craft elements",
    ],
    rubricId: "N3_polished_story",
  },

  // =========================================================================
  // PERSUASIVE/OPINION WRITING
  // =========================================================================

  // -------------------------------------------------------------------------
  // TIER 1 — PERSUASIVE (Ages 7-9)
  // -------------------------------------------------------------------------

  // Unit P1.1: What is an Opinion?
  {
    id: "P1.1.1",
    title: "Fact or Opinion?",
    unit: "What is an Opinion?",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Sort statements into facts and opinions",
      "Understand the difference between facts and opinions",
    ],
  },
  {
    id: "P1.1.2",
    title: "My Opinion Statements",
    unit: "What is an Opinion?",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Write clear opinion sentences using 'I think' or 'I believe'",
      "State an opinion about a familiar topic",
    ],
  },
  {
    id: "P1.1.3",
    title: "Everyone Has Opinions",
    unit: "What is an Opinion?",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Compare different opinions on the same topic",
      "Understand that people can have different opinions",
    ],
  },
  {
    id: "P1.1.4",
    title: "Strong Opinion Words",
    unit: "What is an Opinion?",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Upgrade weak opinions with stronger, more convincing language",
      "Use opinion words like 'best,' 'should,' and 'important'",
    ],
  },
  {
    id: "P1.1.5",
    title: "My Opinion Paragraph",
    unit: "What is an Opinion?",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Write a paragraph stating and explaining an opinion",
      "Include a clear opinion statement and supporting details",
    ],
    rubricId: "P1_opinion_paragraph",
  },

  // Unit P1.2: Reasons Support Opinions
  {
    id: "P1.2.1",
    title: "Why Do You Think That?",
    unit: "Reasons Support Opinions",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Match opinions to supporting reasons",
      "Understand that reasons make opinions stronger",
    ],
  },
  {
    id: "P1.2.2",
    title: "The Word 'Because'",
    unit: "Reasons Support Opinions",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Use the word 'because' to connect opinions and reasons",
      "Complete opinion + because sentences",
    ],
  },
  {
    id: "P1.2.3",
    title: "Finding More Reasons",
    unit: "Reasons Support Opinions",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Brainstorm multiple reasons for one opinion",
      "Choose reasons that support the opinion well",
    ],
  },
  {
    id: "P1.2.4",
    title: "Strongest Reasons First",
    unit: "Reasons Support Opinions",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Rank and order reasons by strength",
      "Put the most convincing reason first",
    ],
  },
  {
    id: "P1.2.5",
    title: "Opinion with Reasons",
    unit: "Reasons Support Opinions",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Write a paragraph with an opinion and two to three reasons",
      "Use 'because' and other connecting words to link ideas",
    ],
    rubricId: "P1_reasons",
  },

  // Unit P1.3: Persuasive Letters
  {
    id: "P1.3.1",
    title: "Parts of a Letter",
    unit: "Persuasive Letters",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Identify the parts of a friendly letter (greeting, body, closing)",
      "Label letter components correctly",
    ],
  },
  {
    id: "P1.3.2",
    title: "Who Am I Writing To?",
    unit: "Persuasive Letters",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Identify the audience for a persuasive letter",
      "Understand how audience affects word choice",
    ],
  },
  {
    id: "P1.3.3",
    title: "Asking Nicely but Strongly",
    unit: "Persuasive Letters",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Practice persuasive phrases that are polite but convincing",
      "Use words like 'please consider' and 'I really hope'",
    ],
  },
  {
    id: "P1.3.4",
    title: "Planning My Letter",
    unit: "Persuasive Letters",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Use a graphic organizer to plan a persuasive letter",
      "Organize opinion, reasons, and closing request",
    ],
  },
  {
    id: "P1.3.5",
    title: "My Persuasive Letter",
    unit: "Persuasive Letters",
    type: "persuasive",
    tier: 1,
    learningObjectives: [
      "Write a persuasive letter to a parent or teacher about something you want",
      "Include letter format, opinion, reasons, and a polite request",
    ],
    rubricId: "P1_persuasive_letter",
  },

  // -------------------------------------------------------------------------
  // TIER 2 — PERSUASIVE (Ages 10-12)
  // -------------------------------------------------------------------------

  // Unit P2.1: Persuasive Essay Structure
  {
    id: "P2.1.1",
    title: "What Is a Thesis?",
    unit: "Persuasive Essay Structure",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Identify and evaluate thesis statements in example essays",
      "Understand that a thesis is the main argument of an essay",
      "Distinguish strong thesis statements from weak ones",
    ],
  },
  {
    id: "P2.1.2",
    title: "Strong Thesis Writing",
    unit: "Persuasive Essay Structure",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Write clear, arguable thesis statements for various topics",
      "Avoid thesis statements that are too broad or too narrow",
      "Practice revising weak theses into strong ones",
    ],
  },
  {
    id: "P2.1.3",
    title: "Topic Sentences",
    unit: "Persuasive Essay Structure",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Create topic sentences that support the thesis",
      "Understand how topic sentences organize body paragraphs",
      "Connect each paragraph back to the central argument",
    ],
  },
  {
    id: "P2.1.4",
    title: "Introductions That Hook",
    unit: "Persuasive Essay Structure",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Write engaging introductory paragraphs for persuasive essays",
      "Use hooks such as questions, statistics, or anecdotes",
      "Move smoothly from hook to thesis statement",
    ],
  },
  {
    id: "P2.1.5",
    title: "Conclusions That Stick",
    unit: "Persuasive Essay Structure",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Write conclusions that call the reader to action",
      "Summarize key points without simply repeating them",
      "End with impact and leave a lasting impression",
    ],
  },
  {
    id: "P2.1.6",
    title: "Essay Structure Practice",
    unit: "Persuasive Essay Structure",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Outline a complete persuasive essay with thesis, body, and conclusion",
      "Demonstrate understanding of persuasive essay structure",
      "Apply all structural elements learned in this unit",
    ],
    rubricId: "P2_persuasive_essay",
  },

  // Unit P2.2: Evidence and Examples
  {
    id: "P2.2.1",
    title: "Types of Evidence",
    unit: "Evidence and Examples",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Categorize different types of evidence (facts, statistics, examples, expert opinions)",
      "Understand when to use each type of evidence",
      "Recognize evidence in published persuasive writing",
    ],
  },
  {
    id: "P2.2.2",
    title: "Facts Strengthen Arguments",
    unit: "Evidence and Examples",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Find relevant facts to support given opinions",
      "Integrate factual evidence into persuasive paragraphs",
      "Explain how facts make arguments more convincing",
    ],
  },
  {
    id: "P2.2.3",
    title: "Examples Make It Real",
    unit: "Evidence and Examples",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Create specific examples to illustrate and support claims",
      "Choose examples that resonate with the intended audience",
      "Connect examples back to the main argument",
    ],
  },
  {
    id: "P2.2.4",
    title: "The Power of Anecdotes",
    unit: "Evidence and Examples",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Write a short anecdote that supports an argument",
      "Understand how personal stories make arguments relatable",
      "Use anecdotes strategically within persuasive writing",
    ],
  },
  {
    id: "P2.2.5",
    title: "Strong vs. Weak Evidence",
    unit: "Evidence and Examples",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Evaluate and rank evidence quality",
      "Identify evidence that is relevant, reliable, and sufficient",
      "Eliminate weak or irrelevant evidence from arguments",
    ],
  },
  {
    id: "P2.2.6",
    title: "Building My Evidence Bank",
    unit: "Evidence and Examples",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Gather and organize evidence for a personal essay topic",
      "Select the strongest evidence to support a thesis",
      "Create an evidence plan for a complete persuasive essay",
    ],
    rubricId: "P2_evidence",
  },

  // Unit P2.3: Counterarguments
  {
    id: "P2.3.1",
    title: "The Other Side",
    unit: "Counterarguments",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Brainstorm opposing viewpoints for a given argument",
      "Understand that strong arguments consider other perspectives",
      "Practice seeing issues from multiple angles",
    ],
  },
  {
    id: "P2.3.2",
    title: "Why Address Counterarguments?",
    unit: "Counterarguments",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Analyze essays with and without counterarguments",
      "Understand how addressing opposition strengthens your position",
      "Recognize the persuasive power of acknowledging other views",
    ],
  },
  {
    id: "P2.3.3",
    title: "Acknowledging Opposition",
    unit: "Counterarguments",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Use phrases for introducing counterarguments ('Some people believe...', 'Critics argue...')",
      "Present opposing views fairly before responding to them",
      "Maintain a respectful tone when discussing disagreement",
    ],
  },
  {
    id: "P2.3.4",
    title: "The Refutation",
    unit: "Counterarguments",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Learn techniques for respectful disagreement and rebuttal",
      "Use evidence to counter opposing arguments",
      "Transition smoothly from counterargument to refutation",
    ],
  },
  {
    id: "P2.3.5",
    title: "Conceding Valid Points",
    unit: "Counterarguments",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Recognize when the opposition has a valid point",
      "Practice partial agreement while maintaining your position",
      "Use concession to build credibility with the reader",
    ],
  },
  {
    id: "P2.3.6",
    title: "My Counterargument Paragraph",
    unit: "Counterarguments",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Write a paragraph that addresses and refutes an opposing view",
      "Demonstrate ability to acknowledge, concede, and counter",
      "Integrate counterargument skills into persuasive writing",
    ],
    rubricId: "P2_counterargument",
  },

  // Unit P2.4: Persuasive Techniques
  {
    id: "P2.4.1",
    title: "Ethos — Why Should I Trust You?",
    unit: "Persuasive Techniques",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Analyze how credibility (ethos) strengthens arguments",
      "Identify ethos appeals in published writing and advertisements",
      "Practice building credibility in your own writing",
    ],
  },
  {
    id: "P2.4.2",
    title: "Pathos — Appeal to Emotion",
    unit: "Persuasive Techniques",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Identify emotional appeals in persuasive writing",
      "Understand when emotional appeals are appropriate and effective",
      "Write passages that connect with readers emotionally",
    ],
  },
  {
    id: "P2.4.3",
    title: "Logos — Appeal to Logic",
    unit: "Persuasive Techniques",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Evaluate logical reasoning in arguments",
      "Identify logical fallacies and weak reasoning",
      "Build arguments using clear logical structure",
    ],
  },
  {
    id: "P2.4.4",
    title: "Spotting Persuasion in Ads",
    unit: "Persuasive Techniques",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Analyze real advertisements for persuasive techniques",
      "Identify which appeals (ethos, pathos, logos) are being used",
      "Evaluate the effectiveness of different persuasive strategies",
    ],
  },
  {
    id: "P2.4.5",
    title: "Choosing the Right Appeal",
    unit: "Persuasive Techniques",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Match persuasive techniques to audience and purpose",
      "Understand that different audiences respond to different appeals",
      "Plan which appeals to use for maximum persuasive impact",
    ],
  },
  {
    id: "P2.4.6",
    title: "My Persuasive Essay",
    unit: "Persuasive Techniques",
    type: "persuasive",
    tier: 2,
    learningObjectives: [
      "Write a persuasive essay using ethos, pathos, and logos",
      "Demonstrate strategic use of all three persuasive appeals",
      "Create a polished essay that persuades through multiple techniques",
    ],
    rubricId: "P2_persuasive_techniques",
  },

  // -------------------------------------------------------------------------
  // TIER 3 — PERSUASIVE (Ages 13-15)
  // -------------------------------------------------------------------------

  // Unit P3.1: Argumentative Essays
  {
    id: "P3.1.1",
    title: "Argument vs. Opinion",
    unit: "Argumentative Essays",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Distinguish well-supported arguments from unsupported opinions",
      "Understand the standards of academic argumentation",
      "Analyze the components of effective arguments",
    ],
  },
  {
    id: "P3.1.2",
    title: "Thesis Complexity",
    unit: "Argumentative Essays",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Craft nuanced thesis statements that acknowledge complexity",
      "Move beyond simple 'pro/con' positions to layered arguments",
      "Write theses that invite exploration rather than just defense",
    ],
  },
  {
    id: "P3.1.3",
    title: "Evidence Integration",
    unit: "Argumentative Essays",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Embed quotes and data smoothly into argument paragraphs",
      "Introduce, cite, and explain evidence effectively",
      "Avoid 'dropped quotes' by always contextualizing evidence",
    ],
  },
  {
    id: "P3.1.4",
    title: "Acknowledging Complexity",
    unit: "Argumentative Essays",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Address gray areas and nuance in arguments",
      "Qualify claims appropriately without weakening them",
      "Demonstrate intellectual honesty in argumentation",
    ],
  },
  {
    id: "P3.1.5",
    title: "Logical Structure",
    unit: "Argumentative Essays",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Organize arguments for maximum impact and logical flow",
      "Use transitions that show logical relationships between ideas",
      "Build arguments that are progressively more convincing",
    ],
  },
  {
    id: "P3.1.6",
    title: "My Argumentative Essay",
    unit: "Argumentative Essays",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Write a complete argumentative essay with nuanced thesis and integrated evidence",
      "Demonstrate mastery of argumentation techniques",
      "Address complexity while maintaining a clear position",
    ],
    rubricId: "P3_argumentative_essay",
  },

  // Unit P3.2: Rhetorical Analysis
  {
    id: "P3.2.1",
    title: "The Rhetorical Situation",
    unit: "Rhetorical Analysis",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Analyze audience, purpose, and context of persuasive texts",
      "Understand how the rhetorical situation shapes communication",
      "Apply rhetorical situation analysis to real-world texts",
    ],
  },
  {
    id: "P3.2.2",
    title: "Ethos, Pathos, Logos Revisited",
    unit: "Rhetorical Analysis",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Evaluate the effectiveness of rhetorical appeals in published texts",
      "Analyze how authors balance ethos, pathos, and logos",
      "Critique rhetorical strategies with evidence from the text",
    ],
  },
  {
    id: "P3.2.3",
    title: "Rhetorical Devices",
    unit: "Rhetorical Analysis",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Identify rhetorical devices such as anaphora, antithesis, and parallelism",
      "Analyze how devices enhance persuasive impact",
      "Evaluate whether devices serve or distract from the argument",
    ],
  },
  {
    id: "P3.2.4",
    title: "Analyzing Arguments",
    unit: "Rhetorical Analysis",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Evaluate the strengths and weaknesses of published arguments",
      "Identify logical fallacies and unsupported claims",
      "Write a balanced evaluation of an argument's effectiveness",
    ],
  },
  {
    id: "P3.2.5",
    title: "Writing Rhetorical Analysis",
    unit: "Rhetorical Analysis",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Structure a rhetorical analysis essay effectively",
      "Move beyond summary to genuine analysis of rhetorical choices",
      "Support analytical claims with specific textual evidence",
    ],
  },
  {
    id: "P3.2.6",
    title: "My Rhetorical Analysis",
    unit: "Rhetorical Analysis",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Write a complete rhetorical analysis of a persuasive text",
      "Demonstrate ability to analyze rather than summarize",
      "Evaluate rhetorical effectiveness with nuance and evidence",
    ],
    rubricId: "P3_rhetorical_analysis",
  },

  // Unit P3.3: Research-Based Arguments
  {
    id: "P3.3.1",
    title: "Research Strategies",
    unit: "Research-Based Arguments",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Develop focused research questions and research plans",
      "Identify appropriate sources for different types of arguments",
      "Use strategic search techniques to find relevant information",
    ],
  },
  {
    id: "P3.3.2",
    title: "Source Evaluation",
    unit: "Research-Based Arguments",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Apply rigorous credibility criteria to sources",
      "Evaluate bias, expertise, and reliability of sources",
      "Distinguish between primary and secondary sources",
    ],
  },
  {
    id: "P3.3.3",
    title: "Synthesis, Not Summary",
    unit: "Research-Based Arguments",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Combine information from multiple sources meaningfully",
      "Identify patterns and connections across sources",
      "Synthesize evidence to build original arguments",
    ],
  },
  {
    id: "P3.3.4",
    title: "Handling Contradictory Evidence",
    unit: "Research-Based Arguments",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Navigate conflicting sources and contradictory evidence",
      "Address contradictions honestly rather than ignoring them",
      "Use contradictory evidence to strengthen arguments through nuance",
    ],
  },
  {
    id: "P3.3.5",
    title: "Citations and Integrity",
    unit: "Research-Based Arguments",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Use proper citation format consistently",
      "Understand academic integrity and the importance of attribution",
      "Integrate citations smoothly into written arguments",
    ],
  },
  {
    id: "P3.3.6",
    title: "My Research Argument",
    unit: "Research-Based Arguments",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Write a research-supported argumentative essay",
      "Integrate and synthesize multiple sources effectively",
      "Demonstrate research competency and academic integrity",
    ],
    rubricId: "P3_research_argument",
  },

  // Unit P3.4: Persuasion in the Real World
  {
    id: "P3.4.1",
    title: "Op-Eds and Editorials",
    unit: "Persuasion in the Real World",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Analyze the structure and purpose of published opinion pieces",
      "Write an op-ed on a topic you care about",
      "Adapt persuasive writing for a newspaper or blog audience",
    ],
  },
  {
    id: "P3.4.2",
    title: "Speeches and Presentations",
    unit: "Persuasion in the Real World",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Write a persuasive speech with rhetorical techniques",
      "Understand how oral persuasion differs from written",
      "Use repetition, rhythm, and pacing for spoken impact",
    ],
  },
  {
    id: "P3.4.3",
    title: "Social Media Advocacy",
    unit: "Persuasion in the Real World",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Craft persuasive messages for social media platforms",
      "Adapt arguments for short-form digital communication",
      "Consider ethics and responsibility in online persuasion",
    ],
  },
  {
    id: "P3.4.4",
    title: "Letters to Officials",
    unit: "Persuasion in the Real World",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Write effective advocacy letters to government officials",
      "Use formal tone and structure appropriate for civic engagement",
      "Support requests with evidence and clear reasoning",
    ],
  },
  {
    id: "P3.4.5",
    title: "Proposal Writing",
    unit: "Persuasion in the Real World",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Write a formal proposal to solve a real-world problem",
      "Structure proposals with problem statement, solution, and justification",
      "Anticipate and address potential objections in proposals",
    ],
  },
  {
    id: "P3.4.6",
    title: "My Real-World Persuasion",
    unit: "Persuasion in the Real World",
    type: "persuasive",
    tier: 3,
    learningObjectives: [
      "Create a persuasive piece for an authentic real-world audience",
      "Demonstrate ability to adapt persuasive skills to practical contexts",
      "Apply all persuasive techniques to effect real change",
    ],
    rubricId: "P3_real_world_persuasion",
  },

  // =========================================================================
  // EXPOSITORY/INFORMATIONAL WRITING
  // =========================================================================

  // -------------------------------------------------------------------------
  // TIER 1 — EXPOSITORY (Ages 7-9)
  // -------------------------------------------------------------------------

  // Unit E1.1: All About Topics
  {
    id: "E1.1.1",
    title: "What Do I Know a Lot About?",
    unit: "All About Topics",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Brainstorm topics you know well",
      "Choose a topic you can write a lot about",
    ],
  },
  {
    id: "E1.1.2",
    title: "Facts About My Topic",
    unit: "All About Topics",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "List five or more facts about a chosen topic",
      "Understand the difference between facts and opinions in informational writing",
    ],
  },
  {
    id: "E1.1.3",
    title: "Grouping My Facts",
    unit: "All About Topics",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Sort facts into categories or groups",
      "Organize information so it makes sense to a reader",
    ],
  },
  {
    id: "E1.1.4",
    title: "Topic Sentences",
    unit: "All About Topics",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Write a sentence that introduces a category of facts",
      "Understand what a topic sentence does in a paragraph",
    ],
  },
  {
    id: "E1.1.5",
    title: "My 'All About' Book",
    unit: "All About Topics",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Write three to four paragraphs about a topic you know well",
      "Include topic sentences, facts, and organized categories",
    ],
    rubricId: "E1_all_about",
  },

  // Unit E1.2: How-To Writing
  {
    id: "E1.2.1",
    title: "What Is How-To Writing?",
    unit: "How-To Writing",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Follow and evaluate sample instructions",
      "Understand the purpose of how-to writing",
    ],
  },
  {
    id: "E1.2.2",
    title: "Steps in Order",
    unit: "How-To Writing",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Sequence scrambled instructions into the correct order",
      "Understand that order matters in procedural writing",
    ],
  },
  {
    id: "E1.2.3",
    title: "Transition Words for Steps",
    unit: "How-To Writing",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Use transition words like first, next, then, and finally",
      "Add transitions to a step-by-step guide",
    ],
  },
  {
    id: "E1.2.4",
    title: "Don't Skip Steps!",
    unit: "How-To Writing",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Identify missing steps in a set of instructions",
      "Include all necessary steps so a reader can follow along",
    ],
  },
  {
    id: "E1.2.5",
    title: "My How-To Guide",
    unit: "How-To Writing",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Write complete instructions for something you know how to do",
      "Include clear steps, transitions, and all necessary details",
    ],
    rubricId: "E1_how_to",
  },

  // Unit E1.3: Compare and Contrast Intro
  {
    id: "E1.3.1",
    title: "Same and Different",
    unit: "Compare and Contrast Intro",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Sort items by similarities and differences",
      "Identify what two things have in common and how they differ",
    ],
  },
  {
    id: "E1.3.2",
    title: "The Venn Diagram",
    unit: "Compare and Contrast Intro",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Complete Venn diagrams for given topics",
      "Use a Venn diagram to organize thinking about similarities and differences",
    ],
  },
  {
    id: "E1.3.3",
    title: "Comparison Words",
    unit: "Compare and Contrast Intro",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Practice using words like 'both,' 'but,' 'however,' and 'alike'",
      "Write sentences that compare and contrast using signal words",
    ],
  },
  {
    id: "E1.3.4",
    title: "Writing Comparison Sentences",
    unit: "Compare and Contrast Intro",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Transform a Venn diagram into written sentences",
      "Write clear sentences that explain similarities and differences",
    ],
  },
  {
    id: "E1.3.5",
    title: "My Comparison Paragraph",
    unit: "Compare and Contrast Intro",
    type: "expository",
    tier: 1,
    learningObjectives: [
      "Write a paragraph comparing two things you know well",
      "Use comparison words and organized thinking from previous lessons",
    ],
    rubricId: "E1_compare_contrast_intro",
  },

  // -------------------------------------------------------------------------
  // TIER 2 — EXPOSITORY (Ages 10-12)
  // -------------------------------------------------------------------------

  // Unit E2.1: Research Basics
  {
    id: "E2.1.1",
    title: "Reliable vs. Unreliable Sources",
    unit: "Research Basics",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Evaluate source credibility using basic criteria",
      "Distinguish between reliable and unreliable sources of information",
      "Understand why source quality matters in informational writing",
    ],
  },
  {
    id: "E2.1.2",
    title: "Finding Information",
    unit: "Research Basics",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Navigate research tools to find relevant information",
      "Use keywords and search strategies effectively",
      "Identify the best sources for different types of information",
    ],
  },
  {
    id: "E2.1.3",
    title: "Note-Taking Strategies",
    unit: "Research Basics",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Practice paraphrasing and summarizing source material",
      "Take notes without copying word-for-word from sources",
      "Organize notes by topic or category for later use",
    ],
  },
  {
    id: "E2.1.4",
    title: "Avoiding Plagiarism",
    unit: "Research Basics",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Rewrite passages in your own words while preserving meaning",
      "Understand what plagiarism is and why it matters",
      "Practice the difference between acceptable paraphrasing and copying",
    ],
  },
  {
    id: "E2.1.5",
    title: "Simple Citations",
    unit: "Research Basics",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Create basic source citations for different types of sources",
      "Understand the purpose of citations in academic writing",
      "Practice formatting citations consistently",
    ],
  },
  {
    id: "E2.1.6",
    title: "My Research Notes",
    unit: "Research Basics",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Compile organized research notes for an assigned topic",
      "Demonstrate paraphrasing, note-taking, and citation skills",
      "Prepare a research foundation for future writing",
    ],
    rubricId: "E2_research_report",
  },

  // Unit E2.2: Informational Essay
  {
    id: "E2.2.1",
    title: "Informational Essay Structure",
    unit: "Informational Essay",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Analyze the structure of informational mentor texts",
      "Identify introduction, body, and conclusion in informational writing",
      "Understand how structure supports clarity in expository writing",
    ],
  },
  {
    id: "E2.2.2",
    title: "Creating Helpful Headings",
    unit: "Informational Essay",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Write headings and subheadings that guide readers through content",
      "Organize information logically under clear headings",
      "Use headings to improve readability and navigation",
    ],
  },
  {
    id: "E2.2.3",
    title: "Introductions That Inform",
    unit: "Informational Essay",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Write engaging introductions for informational essays",
      "Provide context and background that prepares the reader",
      "Preview the main points that will be covered",
    ],
  },
  {
    id: "E2.2.4",
    title: "Body Paragraphs with Evidence",
    unit: "Informational Essay",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Develop body paragraphs with facts, examples, and details",
      "Use topic sentences to organize each paragraph",
      "Integrate information from research into paragraphs smoothly",
    ],
  },
  {
    id: "E2.2.5",
    title: "Conclusions That Summarize",
    unit: "Informational Essay",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Write conclusions that synthesize information without repeating",
      "Leave readers with a final thought or insight",
      "Bring informational essays to a satisfying close",
    ],
  },
  {
    id: "E2.2.6",
    title: "My Informational Essay",
    unit: "Informational Essay",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Write a complete informational essay on a researched topic",
      "Demonstrate clear structure, evidence, and synthesis",
      "Apply all informational writing skills from this unit",
    ],
    rubricId: "E2_informational_essay",
  },

  // Unit E2.3: Compare and Contrast Essays
  {
    id: "E2.3.1",
    title: "Two Ways to Organize",
    unit: "Compare and Contrast Essays",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Compare block and point-by-point organizational structures",
      "Identify the advantages of each organizational approach",
      "Choose the best structure for a given comparison topic",
    ],
  },
  {
    id: "E2.3.2",
    title: "Comparison Transitions",
    unit: "Compare and Contrast Essays",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Practice transition phrases for comparing (similarly, likewise, also)",
      "Practice transition phrases for contrasting (however, on the other hand, whereas)",
      "Use transitions to guide readers between comparison points",
    ],
  },
  {
    id: "E2.3.3",
    title: "Meaningful Comparisons",
    unit: "Compare and Contrast Essays",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Choose comparison criteria that lead to interesting insights",
      "Avoid superficial comparisons by going deeper into analysis",
      "Explain why the comparison matters to the reader",
    ],
  },
  {
    id: "E2.3.4",
    title: "The 'So What?' Conclusion",
    unit: "Compare and Contrast Essays",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Draw meaningful insights and conclusions from comparisons",
      "Answer 'so what?' to give the comparison purpose",
      "Write conclusions that go beyond summarizing differences",
    ],
  },
  {
    id: "E2.3.5",
    title: "My Comparison Essay",
    unit: "Compare and Contrast Essays",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Write a complete compare and contrast essay",
      "Use appropriate organizational structure and transitions",
      "Draw meaningful conclusions from the comparison",
    ],
    rubricId: "E2_compare_contrast",
  },

  // Unit E2.4: Cause and Effect Writing
  {
    id: "E2.4.1",
    title: "Causes and Effects",
    unit: "Cause and Effect Writing",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Identify cause-and-effect relationships in texts",
      "Distinguish between causes and effects in real-world scenarios",
      "Understand that events can have multiple causes and effects",
    ],
  },
  {
    id: "E2.4.2",
    title: "Signal Words",
    unit: "Cause and Effect Writing",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Practice using signal words: because, therefore, consequently, as a result",
      "Write sentences that clearly show cause-and-effect relationships",
      "Choose the right signal word for the context",
    ],
  },
  {
    id: "E2.4.3",
    title: "Multiple Causes, One Effect",
    unit: "Cause and Effect Writing",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Write about situations where multiple causes lead to a single effect",
      "Organize multiple causes in a logical order",
      "Explain how different causes contribute to the same outcome",
    ],
  },
  {
    id: "E2.4.4",
    title: "Chain Reactions",
    unit: "Cause and Effect Writing",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Trace effects that become causes of further effects",
      "Write about chain reactions and cascading consequences",
      "Show how events connect in a cause-and-effect chain",
    ],
  },
  {
    id: "E2.4.5",
    title: "My Cause and Effect Essay",
    unit: "Cause and Effect Writing",
    type: "expository",
    tier: 2,
    learningObjectives: [
      "Write a complete cause-and-effect essay with clear relationships",
      "Use signal words and logical organization throughout",
      "Demonstrate understanding of causal reasoning in writing",
    ],
    rubricId: "E2_cause_effect",
  },

  // -------------------------------------------------------------------------
  // TIER 3 — EXPOSITORY (Ages 13-15)
  // -------------------------------------------------------------------------

  // Unit E3.1: Literary Analysis Essay
  {
    id: "E3.1.1",
    title: "What Is Literary Analysis?",
    unit: "Literary Analysis Essay",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Distinguish literary analysis from summary and personal response",
      "Understand the purpose and conventions of analytical writing",
      "Analyze how literary elements work together to create meaning",
    ],
  },
  {
    id: "E3.1.2",
    title: "Developing an Analytical Thesis",
    unit: "Literary Analysis Essay",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Create debatable analytical claims about literature",
      "Write thesis statements that offer original interpretations",
      "Distinguish between obvious observations and analytical insights",
    ],
  },
  {
    id: "E3.1.3",
    title: "Textual Evidence",
    unit: "Literary Analysis Essay",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Select and embed quotes effectively to support analysis",
      "Introduce quotations with context and follow with explanation",
      "Use both direct quotes and paraphrasing strategically",
    ],
  },
  {
    id: "E3.1.4",
    title: "Analysis vs. Summary",
    unit: "Literary Analysis Essay",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Explain the significance of evidence rather than just presenting it",
      "Move from 'what happens' to 'what it means and why it matters'",
      "Develop analytical paragraphs that interpret rather than retell",
    ],
  },
  {
    id: "E3.1.5",
    title: "Critical Lenses",
    unit: "Literary Analysis Essay",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Apply feminist, historical, and psychological lenses to literature",
      "Understand how different critical perspectives reveal different meanings",
      "Choose a critical lens that illuminates the text in an interesting way",
    ],
  },
  {
    id: "E3.1.6",
    title: "My Literary Analysis",
    unit: "Literary Analysis Essay",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Write a complete literary analysis essay with original interpretation",
      "Support analysis with well-chosen textual evidence",
      "Demonstrate ability to analyze rather than summarize",
    ],
    rubricId: "E3_literary_analysis",
  },

  // Unit E3.2: Research Paper
  {
    id: "E3.2.1",
    title: "Research Paper Structure",
    unit: "Research Paper",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Analyze the structure and conventions of model research papers",
      "Understand the components of academic research writing",
      "Plan the organizational framework for an extended paper",
    ],
  },
  {
    id: "E3.2.2",
    title: "The Research Process",
    unit: "Research Paper",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Plan an extended research project with clear stages",
      "Develop research questions that guide investigation",
      "Create a timeline and strategy for sustained research",
    ],
  },
  {
    id: "E3.2.3",
    title: "Organizing Complex Information",
    unit: "Research Paper",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Create detailed outlines for complex, multi-section papers",
      "Group and sequence information for maximum clarity",
      "Use organizational structures appropriate for the content",
    ],
  },
  {
    id: "E3.2.4",
    title: "Academic Voice",
    unit: "Research Paper",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Develop a scholarly tone appropriate for academic writing",
      "Maintain objectivity while presenting research findings",
      "Use precise, formal language without being stiff or inaccessible",
    ],
  },
  {
    id: "E3.2.5",
    title: "Revision and Editing",
    unit: "Research Paper",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Apply a multi-draft revision process to a research paper",
      "Edit for clarity, coherence, and academic conventions",
      "Proofread for grammar, citations, and formatting",
    ],
  },
  {
    id: "E3.2.6",
    title: "My Research Paper",
    unit: "Research Paper",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Write a complete extended research paper",
      "Demonstrate mastery of research, organization, and academic writing",
      "Integrate sources, maintain academic voice, and follow conventions",
    ],
    rubricId: "E3_research_paper",
  },

  // Unit E3.3: Explanatory Writing
  {
    id: "E3.3.1",
    title: "Making the Complex Clear",
    unit: "Explanatory Writing",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Analyze effective explanations to identify what makes them clear",
      "Break down complex topics into understandable components",
      "Identify strategies for explaining difficult concepts to a general audience",
    ],
  },
  {
    id: "E3.3.2",
    title: "The Power of Analogy",
    unit: "Explanatory Writing",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Create illuminating comparisons and analogies for complex topics",
      "Use the familiar to explain the unfamiliar",
      "Evaluate whether an analogy clarifies or confuses",
    ],
  },
  {
    id: "E3.3.3",
    title: "Anticipating Questions",
    unit: "Explanatory Writing",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Address reader confusion proactively in explanatory writing",
      "Identify where readers are likely to get lost or have questions",
      "Structure explanations to answer questions as they arise",
    ],
  },
  {
    id: "E3.3.4",
    title: "Visual Explanations",
    unit: "Explanatory Writing",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Integrate diagrams, charts, and visual aids into explanatory writing",
      "Describe visual information clearly in text",
      "Decide when a visual explanation is more effective than words alone",
    ],
  },
  {
    id: "E3.3.5",
    title: "Process Explanations",
    unit: "Explanatory Writing",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Explain complex processes clearly and completely",
      "Use sequential and causal language to show how things work",
      "Anticipate and address gaps in the reader's understanding",
    ],
  },
  {
    id: "E3.3.6",
    title: "My Explanatory Piece",
    unit: "Explanatory Writing",
    type: "expository",
    tier: 3,
    learningObjectives: [
      "Write a polished explanatory piece that makes a complex topic accessible",
      "Demonstrate use of analogies, structure, and audience awareness",
      "Explain clearly without oversimplifying or losing accuracy",
    ],
    rubricId: "E3_explanatory",
  },

  // =========================================================================
  // DESCRIPTIVE WRITING
  // =========================================================================

  // -------------------------------------------------------------------------
  // TIER 1 — DESCRIPTIVE (Ages 7-9)
  // -------------------------------------------------------------------------

  // Unit D1.1: Using Your Senses
  {
    id: "D1.1.1",
    title: "The Five Senses",
    unit: "Using Your Senses",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Match descriptions to the correct sense (sight, sound, touch, taste, smell)",
      "Understand that good descriptions use sensory details",
    ],
  },
  {
    id: "D1.1.2",
    title: "What Do You See?",
    unit: "Using Your Senses",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe a picture or scene using only sight words",
      "Use specific visual details instead of vague words",
    ],
  },
  {
    id: "D1.1.3",
    title: "Sounds Around Us",
    unit: "Using Your Senses",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe a place using sounds",
      "Use words that help readers hear what you describe",
    ],
  },
  {
    id: "D1.1.4",
    title: "Touch, Taste, Smell",
    unit: "Using Your Senses",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Add touch, taste, and smell details to descriptions",
      "Use all five senses to make descriptions vivid",
    ],
  },
  {
    id: "D1.1.5",
    title: "My Sensory Description",
    unit: "Using Your Senses",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe a favorite place using three or more senses",
      "Write a vivid description that helps readers experience the place",
    ],
    rubricId: "D1_senses",
  },

  // Unit D1.2: Describing People
  {
    id: "D1.2.1",
    title: "What Do They Look Like?",
    unit: "Describing People",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe a person's physical appearance with specific details",
      "Use descriptive words beyond basic colors and sizes",
    ],
  },
  {
    id: "D1.2.2",
    title: "What Are They Like?",
    unit: "Describing People",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe personality through examples and actions",
      "Show what a person is like instead of just telling",
    ],
  },
  {
    id: "D1.2.3",
    title: "Interesting Details",
    unit: "Describing People",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Find unique details that make a person stand out",
      "Choose the most memorable and specific details to include",
    ],
  },
  {
    id: "D1.2.4",
    title: "Avoiding 'Nice' and 'Good'",
    unit: "Describing People",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Replace vague words like 'nice' and 'good' with specific ones",
      "Build vocabulary for describing people precisely",
    ],
  },
  {
    id: "D1.2.5",
    title: "My Person Description",
    unit: "Describing People",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Write a complete description of someone you know",
      "Include appearance, personality, and unique details",
    ],
    rubricId: "D1_person",
  },

  // Unit D1.3: Describing Places
  {
    id: "D1.3.1",
    title: "Words That Show Where",
    unit: "Describing Places",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Practice spatial vocabulary (beside, above, behind, between)",
      "Use location words to organize descriptions",
    ],
  },
  {
    id: "D1.3.2",
    title: "Taking a Tour",
    unit: "Describing Places",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe a room by moving in a logical order",
      "Guide the reader through a place as if giving a tour",
    ],
  },
  {
    id: "D1.3.3",
    title: "Near and Far",
    unit: "Describing Places",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe an outdoor scene with depth (near to far)",
      "Use spatial organization to create a sense of space",
    ],
  },
  {
    id: "D1.3.4",
    title: "The Feeling of a Place",
    unit: "Describing Places",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Add mood and feeling to a place description",
      "Choose details that create a specific atmosphere",
    ],
  },
  {
    id: "D1.3.5",
    title: "My Special Place",
    unit: "Describing Places",
    type: "descriptive",
    tier: 1,
    learningObjectives: [
      "Describe a place that matters to you using spatial organization",
      "Include sensory details and mood in the description",
    ],
    rubricId: "D1_place",
  },

  // -------------------------------------------------------------------------
  // TIER 2 — DESCRIPTIVE (Ages 10-12)
  // -------------------------------------------------------------------------

  // Unit D2.1: Figurative Language Toolbox
  {
    id: "D2.1.1",
    title: "Similes That Surprise",
    unit: "Figurative Language Toolbox",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Create original similes that go beyond cliches",
      "Understand how similes make descriptions more vivid",
      "Practice writing similes using 'like' and 'as'",
    ],
  },
  {
    id: "D2.1.2",
    title: "Metaphors That Reveal",
    unit: "Figurative Language Toolbox",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Write extended metaphors that reveal deeper meaning",
      "Understand the difference between simile and metaphor",
      "Use metaphors to add layers of meaning to descriptions",
    ],
  },
  {
    id: "D2.1.3",
    title: "Personification Brings Life",
    unit: "Figurative Language Toolbox",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Personify abstract concepts and inanimate objects",
      "Understand how personification makes writing more engaging",
      "Use personification purposefully in descriptive writing",
    ],
  },
  {
    id: "D2.1.4",
    title: "Cliche Alert",
    unit: "Figurative Language Toolbox",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Identify overused phrases and cliches in writing",
      "Replace cliches with original figurative language",
      "Develop a habit of seeking fresh, surprising comparisons",
    ],
  },
  {
    id: "D2.1.5",
    title: "My Figurative Description",
    unit: "Figurative Language Toolbox",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Write a description using multiple figurative language techniques",
      "Demonstrate command of simile, metaphor, and personification",
      "Create original, vivid descriptive writing",
    ],
    rubricId: "D2_figurative_language",
  },

  // Unit D2.2: Tone and Mood
  {
    id: "D2.2.1",
    title: "What Is Mood?",
    unit: "Tone and Mood",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Identify the mood created by descriptive passages",
      "Understand that word choice creates emotional atmosphere",
      "Recognize how mood affects the reader's experience",
    ],
  },
  {
    id: "D2.2.2",
    title: "Word Choice Creates Mood",
    unit: "Tone and Mood",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Rewrite a scene with a different mood by changing word choice",
      "Choose words deliberately to create a target emotional effect",
      "Understand the power of connotation in mood creation",
    ],
  },
  {
    id: "D2.2.3",
    title: "Tone vs. Mood",
    unit: "Tone and Mood",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Distinguish between author's tone and reader's mood",
      "Analyze how tone and mood work together in writing",
      "Identify tone in different types of writing",
    ],
  },
  {
    id: "D2.2.4",
    title: "Maintaining Mood",
    unit: "Tone and Mood",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Edit writing for mood consistency throughout a piece",
      "Identify words or phrases that break the established mood",
      "Maintain a unified emotional atmosphere in extended writing",
    ],
  },
  {
    id: "D2.2.5",
    title: "My Mood Piece",
    unit: "Tone and Mood",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Write a scene with a specific target mood",
      "Use word choice, imagery, and pacing to create atmosphere",
      "Demonstrate control over the emotional effect of writing",
    ],
    rubricId: "D2_mood",
  },

  // Unit D2.3: Descriptive Nonfiction
  {
    id: "D2.3.1",
    title: "Description in Nonfiction",
    unit: "Descriptive Nonfiction",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Analyze how descriptive writing works in nonfiction",
      "Understand the role of description in engaging nonfiction readers",
      "Identify techniques that make nonfiction vivid and readable",
    ],
  },
  {
    id: "D2.3.2",
    title: "Describing Real Places",
    unit: "Descriptive Nonfiction",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Write a vivid description of a real location",
      "Balance factual accuracy with engaging descriptive language",
      "Use observation skills to notice details worth describing",
    ],
  },
  {
    id: "D2.3.3",
    title: "Event Description",
    unit: "Descriptive Nonfiction",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Describe a real event you witnessed with vivid detail",
      "Capture the energy and atmosphere of an event in writing",
      "Organize event description with clear structure",
    ],
  },
  {
    id: "D2.3.4",
    title: "Profile Writing",
    unit: "Descriptive Nonfiction",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Write a descriptive profile of a real person",
      "Combine physical description with personality and character",
      "Use anecdotes and quotes to bring a real person to life",
    ],
  },
  {
    id: "D2.3.5",
    title: "My Descriptive Nonfiction",
    unit: "Descriptive Nonfiction",
    type: "descriptive",
    tier: 2,
    learningObjectives: [
      "Write a complete polished descriptive nonfiction piece",
      "Demonstrate ability to make real subjects vivid and engaging",
      "Balance description with information in nonfiction writing",
    ],
    rubricId: "D2_descriptive_nonfiction",
  },

  // -------------------------------------------------------------------------
  // TIER 3 — DESCRIPTIVE (Ages 13-15)
  // -------------------------------------------------------------------------

  // Unit D3.1: Literary Description
  {
    id: "D3.1.1",
    title: "Description as Literature",
    unit: "Literary Description",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Analyze literary descriptive passages for craft and technique",
      "Understand how description serves narrative and thematic purposes",
      "Identify the qualities that elevate description to literary art",
    ],
  },
  {
    id: "D3.1.2",
    title: "Imagery That Resonates",
    unit: "Literary Description",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Create powerful imagery that engages the reader's imagination",
      "Use concrete sensory details to evoke abstract emotions",
      "Develop imagery that serves the larger purpose of the piece",
    ],
  },
  {
    id: "D3.1.3",
    title: "Symbolic Description",
    unit: "Literary Description",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Embed meaning in descriptive detail choices",
      "Use objects, settings, and images as symbols",
      "Create descriptions that operate on literal and symbolic levels",
    ],
  },
  {
    id: "D3.1.4",
    title: "Atmosphere Creation",
    unit: "Literary Description",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Build mood and atmosphere through sustained description",
      "Use setting details to reflect character psychology",
      "Create immersive environments through careful word choice",
    ],
  },
  {
    id: "D3.1.5",
    title: "Economy of Language",
    unit: "Literary Description",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Say more with less through precise word choice",
      "Eliminate unnecessary words while preserving richness",
      "Understand that restraint can be more powerful than excess",
    ],
  },
  {
    id: "D3.1.6",
    title: "My Literary Description",
    unit: "Literary Description",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Write a polished literary descriptive piece",
      "Demonstrate mastery of imagery, symbolism, and atmosphere",
      "Create description that resonates on multiple levels",
    ],
    rubricId: "D3_literary_description",
  },

  // Unit D3.2: Personal Essays and Memoir
  {
    id: "D3.2.1",
    title: "The Personal Essay Tradition",
    unit: "Personal Essays and Memoir",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Read and analyze memoir excerpts from published authors",
      "Understand the conventions and purposes of personal essay writing",
      "Identify what makes personal writing compelling to readers",
    ],
  },
  {
    id: "D3.2.2",
    title: "Finding the Universal",
    unit: "Personal Essays and Memoir",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Connect personal experience to broader themes and ideas",
      "Find universal meaning in specific personal moments",
      "Understand why readers connect with personal writing that transcends the personal",
    ],
  },
  {
    id: "D3.2.3",
    title: "Scene Writing",
    unit: "Personal Essays and Memoir",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Create vivid scenes from memory using sensory detail",
      "Reconstruct moments with descriptive precision",
      "Use scene writing to immerse readers in personal experience",
    ],
  },
  {
    id: "D3.2.4",
    title: "Reflection and Meaning",
    unit: "Personal Essays and Memoir",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Balance showing (scene) with telling (reflection) in personal essays",
      "Move between narrative and analysis naturally",
      "Use reflection to draw meaning from described experiences",
    ],
  },
  {
    id: "D3.2.5",
    title: "Vulnerability and Honesty",
    unit: "Personal Essays and Memoir",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Write with authentic voice and emotional honesty",
      "Take risks in personal writing while maintaining boundaries",
      "Understand how vulnerability creates connection with readers",
    ],
  },
  {
    id: "D3.2.6",
    title: "My Personal Essay",
    unit: "Personal Essays and Memoir",
    type: "descriptive",
    tier: 3,
    learningObjectives: [
      "Write a polished personal or memoir essay",
      "Demonstrate mastery of scene writing, reflection, and authentic voice",
      "Connect personal experience to universal meaning",
    ],
    rubricId: "D3_personal_essay",
  },
];

// ---------------------------------------------------------------------------
// Indexed lookup structures
// ---------------------------------------------------------------------------
const lessonById = new Map<string, Lesson>();
const lessonsByTier = new Map<Tier, Lesson[]>();

for (const lesson of lessons) {
  lessonById.set(lesson.id, lesson);

  const tierList = lessonsByTier.get(lesson.tier) ?? [];
  tierList.push(lesson);
  lessonsByTier.set(lesson.tier, tierList);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getLesson(lessonId: string): Lesson | undefined {
  return lessonById.get(lessonId);
}

export function getLessonsByTier(tier: Tier): Lesson[] {
  return lessonsByTier.get(tier) ?? [];
}

export function getAllLessons(): Lesson[] {
  return [...lessons];
}
