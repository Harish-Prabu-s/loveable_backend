
// Avatar utility to generate deterministic avatars based on gender and ID
// Uses DiceBear Avataaars for a consistent, illustrative style similar to the reference.

const MALE_SEEDS = [
  'Felix', 'Aneka', 'Mark', 'John', 'David', 'Ryan', 'Chris', 'James', 'Michael', 'Robert',
  'William', 'Joseph', 'Charles', 'Thomas', 'Daniel', 'Matthew', 'Anthony', 'Donald', 'Paul', 'George',
  'Kenneth', 'Steven', 'Edward', 'Brian', 'Ronald', 'Kevin', 'Jason', 'Jeffrey', 'Frank', 'Scott',
  'Eric', 'Stephen', 'Andrew', 'Raymond', 'Gregory', 'Joshua', 'Jerry', 'Dennis', 'Walter', 'Patrick',
  'Peter', 'Harold', 'Douglas', 'Henry', 'Carl', 'Arthur', 'Ryan', 'Roger', 'Joe', 'Juan'
];

const FEMALE_SEEDS = [
  'Zoe', 'Lisa', 'Sarah', 'Jessica', 'Emily', 'Ashley', 'Jennifer', 'Amanda', 'Melissa', 'Nicole',
  'Elizabeth', 'Stephanie', 'Rebecca', 'Laura', 'Sharon', 'Cynthia', 'Kathleen', 'Amy', 'Shirley', 'Angela',
  'Helen', 'Anna', 'Brenda', 'Pamela', 'Emma', 'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel',
  'Carolyn', 'Janet', 'Maria', 'Heather', 'Diane', 'Virginia', 'Julie', 'Joyce', 'Victoria', 'Olivia',
  'Kelly', 'Christina', 'Joan', 'Evelyn', 'Lauren', 'Judith', 'Megan', 'Cheryl', 'Andrea', 'Hannah'
];

export const getAvatarUrl = (gender: 'M' | 'F' | 'O' | null, id: string | number): string => {
  const seedList = gender === 'F' ? FEMALE_SEEDS : MALE_SEEDS;
  
  // Use the ID to select a deterministic seed from the list
  // If ID is a string, sum its char codes to get an index
  let index = 0;
  if (typeof id === 'number') {
    index = id % seedList.length;
  } else {
    const sum = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    index = sum % seedList.length;
  }
  
  const seed = seedList[index];
  
  // Using DiceBear Avataaars
  // backgroundType: gradientLinear (to match the app's vibe)
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;
};

// Helper to get a random avatar for new users or demos
export const getRandomAvatar = (gender: 'M' | 'F' = 'M') => {
  const seedList = gender === 'F' ? FEMALE_SEEDS : MALE_SEEDS;
  const seed = seedList[Math.floor(Math.random() * seedList.length)];
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;
};
