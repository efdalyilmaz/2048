import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  GestureResponderEvent,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Board = number[][];
type Direction = 'up' | 'down' | 'left' | 'right';

const BOARD_SIZE = 4;
const CELL_SIZE = Dimensions.get('window').width * 0.2;
const CELL_MARGIN = 5;
const HIGH_SCORE_KEY = '@game2048_highscore';

const Game2048: React.FC = () => {
  const [board, setBoard] = useState<Board>([]);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startY, setStartY] = useState<number>(0);

  // Yüksek skoru yükle
  useEffect(() => {
    loadHighScore();
  }, []);

  // Yüksek skoru AsyncStorage'dan yükle
  const loadHighScore = async () => {
    try {
      const savedScore = await AsyncStorage.getItem(HIGH_SCORE_KEY);
      if (savedScore !== null) {
        setHighScore(parseInt(savedScore));
      }
    } catch (error) {
      console.error('Yüksek skor yüklenirken hata:', error);
    }
  };

  // Yeni yüksek skoru kaydet
  const saveHighScore = async (newScore: number) => {
    try {
      if (newScore > highScore) {
        await AsyncStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        setHighScore(newScore);
      }
    } catch (error) {
      console.error('Yüksek skor kaydedilirken hata:', error);
    }
  };

  // Yeni oyun tahtası oluştur
  const initializeBoard = (): Board => {
    const newBoard = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
    return addNewTile(addNewTile(newBoard));
  };

  // Oyunu başlat
  useEffect(() => {
    setBoard(initializeBoard());
  }, []);

  // [Önceki addNewTile fonksiyonu aynı kalır...]
  const addNewTile = (currentBoard: Board): Board => {
    const availableCells: [number, number][] = [];
    
    currentBoard.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (cell === 0) {
          availableCells.push([i, j]);
        }
      });
    });

    if (availableCells.length === 0) return currentBoard;

    const [newX, newY] = availableCells[Math.floor(Math.random() * availableCells.length)];
    const newValue = Math.random() < 0.9 ? 2 : 4;
    
    const newBoard = [...currentBoard];
    newBoard[newX][newY] = newValue;
    return newBoard;
  };

  // Tahtayı belirtilen yönde kaydır
  const moveBoard = (direction: Direction) => {
    let newBoard = [...board];
    let moved = false;
    let newScore = score;

    const rotate = (matrix: Board): Board => {
      const N = matrix.length;
      const rotated = matrix.map((row, i) =>
        row.map((val, j) => matrix[N - 1 - j][i])
      );
      return rotated;
    };

    // [Önceki moveLeft fonksiyonu aynı kalır...]
    const moveLeft = (currentBoard: Board): [Board, number, boolean] => {
      const N = currentBoard.length;
      const newBoard = Array(N).fill(0).map(() => Array(N).fill(0));
      let score = 0;
      let moved = false;

      for (let i = 0; i < N; i++) {
        let position = 0;
        let merged = false;

        for (let j = 0; j < N; j++) {
          if (currentBoard[i][j] === 0) continue;

          if (position > 0 && !merged && 
              newBoard[i][position - 1] === currentBoard[i][j]) {
            newBoard[i][position - 1] *= 2;
            score += newBoard[i][position - 1];
            merged = true;
            moved = true;
          } else {
            if (j !== position || currentBoard[i][j] !== newBoard[i][position]) {
              moved = true;
            }
            newBoard[i][position] = currentBoard[i][j];
            position++;
            merged = false;
          }
        }
      }

      return [newBoard, score, moved];
    };

    switch (direction) {
      case 'left':
        [newBoard, newScore, moved] = moveLeft(newBoard);
        break;
      case 'right':
        newBoard = rotate(rotate(newBoard));
        [newBoard, newScore, moved] = moveLeft(newBoard);
        newBoard = rotate(rotate(newBoard));
        break;
      case 'up':
        newBoard = rotate(rotate(rotate(newBoard)));
        [newBoard, newScore, moved] = moveLeft(newBoard);
        newBoard = rotate(newBoard);
        break;
      case 'down':
        newBoard = rotate(newBoard);
        [newBoard, newScore, moved] = moveLeft(newBoard);
        newBoard = rotate(rotate(rotate(newBoard)));
        break;
    }

    if (moved) {
      newBoard = addNewTile(newBoard);
      const finalScore = score + newScore;
      setScore(finalScore);
      setBoard(newBoard);
      
      // Yeni skoru kontrol et ve kaydet
      saveHighScore(finalScore);
      
      if (isGameOver(newBoard)) {
        setGameOver(true);
        Alert.alert('Oyun Bitti!', 
          `Skorunuz: ${finalScore}\nEn Yüksek Skor: ${Math.max(highScore, finalScore)}`
        );
      }
    }
  };

  // [Önceki isGameOver fonksiyonu aynı kalır...]
  const isGameOver = (currentBoard: Board): boolean => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (currentBoard[i][j] === 0) return false;
      }
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE - 1; j++) {
        if (currentBoard[i][j] === currentBoard[i][j + 1]) return false;
        if (currentBoard[j][i] === currentBoard[j + 1][i]) return false;
      }
    }

    return true;
  };

  // [Önceki touch handler'lar aynı kalır...]
  const handleTouchStart = (event: GestureResponderEvent) => {
    setStartX(event.nativeEvent.locationX);
    setStartY(event.nativeEvent.locationY);
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    const diffX = event.nativeEvent.locationX - startX;
    const diffY = event.nativeEvent.locationY - startY;
    const minSwipeDistance = 50;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > minSwipeDistance) {
        moveBoard(diffX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(diffY) > minSwipeDistance) {
        moveBoard(diffY > 0 ? 'down' : 'up');
      }
    }
  };

  // [Önceki getCellColor fonksiyonu aynı kalır...]
  const getCellColor = (value: number): string => {
    const colors: { [key: number]: string } = {
      0: '#cdc1b4',
      2: '#eee4da',
      4: '#ede0c8',
      8: '#f2b179',
      16: '#f59563',
      32: '#f67c5f',
      64: '#f65e3b',
      128: '#edcf72',
      256: '#edcc61',
      512: '#edc850',
      1024: '#edc53f',
      2048: '#edc22e'
    };
    return colors[value] || '#cdc1b4';
  };

  // Yeni oyun başlat
  const resetGame = () => {
    setBoard(initializeBoard());
    setScore(0);
    setGameOver(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>2048</Text>
        <View style={styles.scoreContainer}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Skor</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>En Yüksek</Text>
            <Text style={styles.scoreValue}>{highScore}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newGameButton} onPress={resetGame}>
          <Text style={styles.buttonText}>Yeni Oyun</Text>
        </TouchableOpacity>
      </View>

      <View 
        style={styles.board}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {board.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((cell, j) => (
              <View
                key={`${i}-${j}`}
                style={[
                  styles.cell,
                  { backgroundColor: getCellColor(cell) }
                ]}
              >
                <Text style={[
                  styles.cellText,
                  { color: cell <= 4 ? '#776e65' : '#f9f6f2' }
                ]}>
                  {cell || ''}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#776e65',
    marginBottom: 10,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  scoreBox: {
    backgroundColor: '#bbada0',
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#eee4da',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  newGameButton: {
    backgroundColor: '#8f7a66',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: '#f9f6f2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  board: {
    backgroundColor: '#bbada0',
    padding: CELL_MARGIN,
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_MARGIN,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Game2048;