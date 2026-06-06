export type Profile = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string;
  created_at: string;
};

export type Admin = {
  id: string;
  profile_id: string;
  added_by: string | null;
  created_at: string;
  profile?: Profile;
};

export type GameStatus = 'open' | 'closed' | 'completed' | 'cancelled';

export type Game = {
  id: string;
  title: string;
  location: string | null;
  scheduled_at: string;
  max_players: number;
  status: GameStatus;
  created_by: string;
  created_at: string;
};

export type RegistrationStatus = 'confirmed' | 'waitlist';

export type Registration = {
  id: string;
  game_id: string;
  profile_id: string;
  status: RegistrationStatus;
  position: number;
  added_by: string | null;
  created_at: string;
  profile?: Profile;
};

export type Team = {
  id: string;
  game_id: string;
  name: string;
  created_at: string;
  members?: Profile[];
};
