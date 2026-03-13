import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const GRID_SIZE = 6;
const CANDIES = ['❤️', '🍬', '🍭', '🧁', '🍩', '🍪'];

export default function CandyMatch({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent') => void }) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [selected, setSelected] = useState<{ r: number, c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(15);

  useEffect(() => {
    const newGrid = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => CANDIES[Math.floor(Math.random() * CANDIES.length)])
    );
    setGrid(newGrid);
  }, []);

  const checkMatches = (currentGrid: string[][]) => {
    const matched = new Set<string>();

    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        if (currentGrid[r][c] === currentGrid[r][c + 1] && currentGrid[r][c] === currentGrid[r][c + 2]) {
          matched.add(`${r},${c}`);
          matched.add(`${r},${c + 1}`);
          matched.add(`${r},${c + 2}`);
        }
      }
    }
    // Vertical
    for (let r = 0; r < GRID_SIZE - 2; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c] === currentGrid[r + 1][c] && currentGrid[r][c] === currentGrid[r + 2][c]) {
          matched.add(`${r},${c}`);
          matched.add(`${r + 1},${c}`);
          matched.add(`${r + 2},${c}`);
        }
      }
    }
    return matched;
  };

  const handleInteraction = (r: number, c: number) => {
    if (moves <= 0) return;

    if (!selected) {
      setSelected({ r, c });
    } else {
      const isAdjacent = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;

      if (isAdjacent) {
        const newGrid = [...grid.map(row => [...row])];
        const temp = newGrid[r][c];
        newGrid[r][c] = newGrid[selected.r][selected.c];
        newGrid[selected.r][selected.c] = temp;

        const matches = checkMatches(newGrid);

        if (matches.size > 0) {
          matches.forEach(key => {
            const [mr, mc] = key.split(',').map(Number);
            newGrid[mr][mc] = CANDIES[Math.floor(Math.random() * CANDIES.length)];
          });
          setScore(s => s + matches.size * 10);
          setGrid(newGrid);
        } else {
          setGrid(newGrid);
        }
        setMoves(m => m - 1);
        setSelected(null);

        if (score > 300) onGameOver('me');
        if (moves <= 1 && score < 300) onGameOver('opponent');
      } else {
        setSelected({ r, c });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Score: {score}</Text>
        <Text style={styles.headerText}>Moves: {moves}</Text>
      </View>

      <View style={styles.gridBoard}>
        {grid.map((row, r) => (
          <View key={`row-${r}`} style={styles.row}>
            {row.map((candy, c) => {
              const isSelected = selected?.r === r && selected?.c === c;
              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  onPress={() => handleInteraction(r, c)}
                  activeOpacity={0.8}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected
                  ]}
                >
                  <Text style={styles.candyText}>{candy}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.instruction}>Swap candies to match 3!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FCE7F3', // pink-100
    padding: 16,
    borderRadius: 24,
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151', // gray-700
  },
  gridBoard: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 44,
    height: 44,
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  cellSelected: {
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#8B5CF6', // primary line
    transform: [{ scale: 1.1 }],
    zIndex: 10,
  },
  candyText: {
    fontSize: 28,
  },
  instruction: {
    marginTop: 16,
    fontSize: 12,
    color: '#6B7280', // gray-500
  }
});
