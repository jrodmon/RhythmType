import React, { useState, useEffect, useRef } from "react";
import words from "./words.json";
import furElise from "./musicSheets/fur_elise.json";
import moonlight from "./musicSheets/moonlight_sonata.json";

function App() {
  const [letters, setLetters] = useState([]);
  const [running, setRunning] = useState(true);
  const [currentWord, setCurrentWord] = useState("");
  const [wordColor, setWordColor] = useState("red");
  const spawnTimeout = useRef(null);
  const letterIndexRef = useRef(0);
  const currentXRef = useRef(0);
  const noteIndexRef = useRef(0); // track which note to play next

  const gameWidth = 1000;
  const gameHeight = 600;
  const letterSpacing = 40;

  // Map sharps to flats
  const enharmonicMap = {
    "C#": "Db",
    "D#": "Eb",
    "F#": "Gb",
    "G#": "Ab",
    "A#": "Bb",
  };


  // Pick a new random word
  const chooseNewWord = () => {
    const newWord = words[Math.floor(Math.random() * words.length)];
    // Wrap to left if overflow
    if (currentXRef.current + newWord.length * letterSpacing > gameWidth) {
      currentXRef.current = 0;
    }
    setCurrentWord(newWord);
    letterIndexRef.current = 0;
    setWordColor((prev) => (prev === "red" ? "blue" : "red"));
  };

  useEffect(() => {
    chooseNewWord();
  }, []);

  // Spawn letters sequentially
  useEffect(() => {
    if (!currentWord) return;

    const spawnNextLetter = () => {
      if (!running) return;

      const index = letterIndexRef.current;

      if (index >= currentWord.length) {
        spawnTimeout.current = setTimeout(() => {
          if (running) chooseNewWord();
        }, 150);                    // additional delay after word completion
        return;
      }

      const newLeft = currentXRef.current;

      const newLetter = {
        id: Date.now() + Math.random(),
        char: currentWord[index].toUpperCase(),
        top: 0,
        left: newLeft,
        color: wordColor,
      };

      setLetters((prev) => [...prev, newLetter]);
      currentXRef.current += letterSpacing;
      letterIndexRef.current = index + 1;

      spawnTimeout.current = setTimeout(spawnNextLetter, 300);    // Delay between each letter  
    };

    spawnNextLetter();

    return () => {
      if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    };
  }, [currentWord, running, wordColor]);

  // Move letters downward
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setLetters((prev) =>
        prev
          .map((letter) => ({ ...letter, top: letter.top + 15 }))
          .filter((letter) => letter.top < gameHeight - 15)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [running]);

  // Handle typing + pause + play notes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setRunning((prev) => !prev);
        return;
      }
      if (!running) return;

      // Remove typed letter
      setLetters((prev) => {
        const index = prev.findIndex(
          (letter) => letter.char.toLowerCase() === e.key.toLowerCase()
        );
        if (index !== -1) {
          return [...prev.slice(0, index), ...prev.slice(index + 1)];
        }
        return prev;
      });

      // Play next note from musicSheet JSON
      const note = furElise[noteIndexRef.current];
      //const note = moonlight[noteIndexRef.current];
      if (note) {
        const audio = new Audio(`/sounds/${note}.mp3`);
        audio.currentTime = 0;
        audio.play();
        noteIndexRef.current =
          (noteIndexRef.current + 1) % furElise.length; // loop song
          //(noteIndexRef.current + 1) % moonlight.length; // loop song
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [running]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#111",
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${gameWidth}px`,
          height: `${gameHeight}px`,
          overflow: "hidden",
          background: "#111",
          color: "white",
          border: "2px solid #333",
          borderRadius: "8px",
        }}
      >
        {letters.map((letter) => (
          <div
            key={letter.id}
            style={{
              position: "absolute",
              top: letter.top,
              left: letter.left,
              fontSize: "24px",
              fontWeight: "bold",
              color: letter.color,
            }}
          >
            {letter.char}
          </div>
        ))}

        {/* Orange input line */}
        <div
          style={{
            position: "absolute",
            bottom: "150px",
            left: 0,
            width: "100%",
            height: "4px",
            backgroundColor: "orange",
          }}
        />

        {!running && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "32px",
              color: "red",
            }}
          >
            Paused
          </div>
        )}

        {/* Pause/Resume Button */}
        <button
          onClick={() => setRunning((prev) => !prev)}
          style={{
            position: "absolute",
            top: "-50px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {running ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}

export default App;
