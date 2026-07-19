export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Participant {
  id: number;
  name: string;
  email: string | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TranscriptSegment {
  id: number;
  meeting_id: number;
  speaker_id: number;
  start_time_seconds: number;
  end_time_seconds: number;
  text: string;
  sequence_order: number;
  speaker: Participant;
}

export interface Summary {
  id: number;
  meeting_id: number;
  overview_text: string;
  keywords: string[];
  generated_at: string;
}

export interface Topic {
  id: number;
  meeting_id: number;
  title: string;
  start_time_seconds: number | null;
  end_time_seconds: number | null;
  sequence_order: number;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  assignee_id: number | null;
  is_complete: boolean;
  created_at: string;
  assignee?: Participant | null;
}

export interface Meeting {
  id: number;
  user_id: number;
  title: string;
  date: string;
  duration_seconds: number;
  media_url: string | null;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  tags: Tag[];
  emoji_summary: string[];
}

export interface MeetingDetail extends Meeting {
  transcript_segments: TranscriptSegment[];
  summary: Summary | null;
  topics: Topic[];
  action_items: ActionItem[];
  bookmarks: Bookmark[];
  comments: Comment[];
  soundbites: Soundbite[];
}

export interface Bookmark {
  id: number;
  meeting_id: number;
  timestamp_seconds: number;
  note: string | null;
  created_at: string;
}

export interface Comment {
  id: number;
  meeting_id: number;
  author_name: string;
  text: string;
  timestamp_seconds: number | null;
  created_at: string;
}

export interface Soundbite {
  id: number;
  meeting_id: number;
  title: string;
  from_seconds: number;
  to_seconds: number;
  speaker_name: string | null;
  created_at: string;
}

export interface TranscriptSearchMatch {
  segment: TranscriptSegment;
  context_before: TranscriptSegment[];
  context_after: TranscriptSegment[];
}
