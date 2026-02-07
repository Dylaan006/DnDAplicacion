export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface CharacterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface CharacterSkills {
  acrobatics?: boolean;
  animal_handling?: boolean;
  arcana?: boolean;
  athletics?: boolean;
  deception?: boolean;
  history?: boolean;
  insight?: boolean;
  intimidation?: boolean;
  investigation?: boolean;
  medicine?: boolean;
  nature?: boolean;
  perception?: boolean;
  performance?: boolean;
  persuasion?: boolean;
  religion?: boolean;
  sleight_of_hand?: boolean;
  stealth?: boolean;
  survival?: boolean;
}

export interface Ability {
  title: string;
  desc: string;
  type?: 'feature' | 'spell' | 'trait';
}

export interface Character {
  id: string;
  user_id: string;

  // Identity
  name: string;
  class: string; // Could be an enum later
  race: string;
  background?: string;
  alignment?: string;
  level: number;
  xp?: number;

  // Vitals
  hp_current: number;
  hp_max: number;
  hp_temp?: number;
  armor_class: number;
  speed: string; // "30 ft"
  initiative: number;

  // Stats & Skills
  stats: CharacterStats;
  saving_throws?: Partial<CharacterStats>; // Booleans for proficiency in saves
  skills?: CharacterSkills; // Booleans for proficiency

  // Content
  abilities: Ability[];
  bio?: string;
  image_url?: string;

  created_at?: string;
}

export interface Profile {
  id: string; // matches auth.users
  role: 'player' | 'dm' | 'admin';
  created_at?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon_key: string | null;
  created_by?: string;
  created_at?: string;
}

export interface CharacterBadge {
  id: string;
  character_id: string;
  badge_id: string;
  awarded_at: string;
}

export interface Item {
  id: string;
  character_id: string;
  name: string;
  description: string | null;
  type: 'weapon' | 'armor' | 'potion' | 'gear' | 'treasure' | 'general';
  quantity: number;
  weight?: number;
  equipped?: boolean;
  is_official: boolean;
  created_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  dm_id: string;
  join_code: string;
  is_active: boolean;
  created_at?: string;
}

export interface CampaignParticipant {
  id: string;
  campaign_id: string;
  user_id: string;
  character_id: string | null;
  role: 'dm' | 'player' | 'spectator';
  joined_at: string;
}

export interface Database {
  public: {
    Tables: {
      characters: {
        Row: Character;
        Insert: Partial<Character>;
        Update: Partial<Character>;
      };
      items: {
        Row: Item;
        Insert: Partial<Item>;
        Update: Partial<Item>;
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      badges: {
        Row: Badge;
        Insert: Partial<Badge>;
        Update: Partial<Badge>;
      };
      character_badges: {
        Row: CharacterBadge;
        Insert: Partial<CharacterBadge>;
        Update: Partial<CharacterBadge>;
      };
      campaigns: {
        Row: Campaign;
        Insert: Partial<Campaign>;
        Update: Partial<Campaign>;
      };
      campaign_participants: {
        Row: CampaignParticipant;
        Insert: Partial<CampaignParticipant>;
        Update: Partial<CampaignParticipant>;
      };
    };
  };
}
