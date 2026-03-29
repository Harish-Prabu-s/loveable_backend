import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TicTacToe({ onGameOver }: { onGameOver: (winner: 'me' | 'opponent' | 'draw') => void }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    return null;
  };

  const result = useMemo(() => calculateWinner(board), [board]);
  const winner = result?.winner;

  useEffect(() => {
    if (result?.line) {
      setWinningLine(result.line);
    } else {
      setWinningLine(null);
    }
  }, [result?.line]);

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const newBoard = [...board];
    newBoard[i] = 'X'; // User is always X
    setBoard(newBoard);
    setIsXNext(false);
  };

  // Bot Turn
  useEffect(() => {
    if (!isXNext && !winner && board.includes(null)) {
      const timer = setTimeout(() => {
        const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        const moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];

        const newBoard = [...board];
        newBoard[moveIndex] = 'O';
        setBoard(newBoard);
        setIsXNext(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isXNext, winner, board]);

  useEffect(() => {
    if (winner) {
      const timer = setTimeout(() => {
        if (winner === 'X') onGameOver('me');
        else onGameOver('opponent');
      }, 1500);
      return () => clearTimeout(timer);
    } else if (!board.includes(null)) {
      const timer = setTimeout(() => onGameOver('draw'), 1500);
      return () => clearTimeout(timer);
    }
  }, [winner, board, onGameOver]);

  return (
    <View style={styles.container}>
      {/* Score/Status Header */}
      <View style={styles.header}>
        <View style={[styles.playerObj, isXNext && styles.activePlayer]}>
          <Text style={styles.playerLabel}>You</Text>
          <Text style={[styles.playerMark, { color: '#22D3EE' }]}>X</Text>
        </View>

        <View style={styles.headerDivider} />

        <View style={styles.statusBox}>
          {winner ? (
            <View style={styles.winnerBox}>
              <MaterialCommunityIcons name="trophy" size={24} color="#FACC15" style={{ marginBottom: 4 }} />
              <Text style={[styles.statusText, { color: '#FACC15' }]}>
                {winner === 'X' ? 'VICTORY!' : 'DEFEAT'}
              </Text>
            </View>
          ) : (
            <Text style={styles.statusText}>
              {isXNext ? 'Your Turn' : 'Thinking...'}
            </Text>
          )}
        </View>

        <View style={styles.headerDivider} />

        <View style={[styles.playerObj, !isXNext && styles.activePlayer]}>
          <Text style={styles.playerLabel}>CPU</Text>
          <Text style={[styles.playerMark, { color: '#EC4899' }]}>O</Text>
        </View>
      </View>

      {/* Game Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.grid}>
          {board.map((square, i) => {
            const isWinningSquare = winningLine?.includes(i);
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.square,
                  square ? styles.squareFilled : styles.squareEmpty,
                  isWinningSquare && styles.squareWinning
                ]}
                onPress={() => handleClick(i)}
                disabled={!!square || !!winner || !isXNext}
                activeOpacity={0.7}
              >
                {square === 'X' && <Text style={[styles.markText, { color: '#22D3EE' }]}>X</Text>}
                {square === 'O' && <Text style={[styles.markText, { color: '#EC4899' }]}>O</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.footerText}>
        Win to earn <Text style={{ color: '#FACC15', fontWeight: 'bold' }}>20 coins</Text>.{'\n'}
        Draw refunds entry.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  playerObj: {
    alignItems: 'center',
    opacity: 0.5,
  },
  activePlayer: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  playerLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerMark: {
    fontSize: 28,
    fontWeight: '900',
  },
  headerDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  winnerBox: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  gridContainer: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  grid: {
    width: 300,
    height: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  square: {
    width: 92,
    height: 92,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  squareEmpty: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
  },
  squareFilled: {
    backgroundColor: '#334155',
  },
  squareWinning: {
    borderWidth: 4,
    borderColor: '#FACC15',
    zIndex: 10,
  },
  markText: {
    fontSize: 56,
    fontWeight: '900',
  },
  footerText: {
    marginTop: 24,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  }
});
