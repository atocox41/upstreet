import React, {
  useEffect,
  useState,
  useRef,
} from 'react';
import classnames from 'classnames';
// import classnames from 'classnames';

import styles from './MemoryViewer.module.css';
import Icon from '../ui/icon/Icon';

/**
 * A component that displays a list of memories and allows the user to search and delete memories.
 * @function MemoryViewer
 * @param {Object} props - The props object.
 * @param {aiAgentController} props.aiAgentController - The controller for the Companion AI agent.
 * @param {MemoryClient} props.memoryClient - The client for interacting with the memory database.
 * @param {string} props.currentPlayerId - The ID of the current player.
 * @returns {JSX.Element} - The MemoryViewer component.
 */
export const MemoryViewer = ({
  aiAgentController,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [memories, setMemories] = useState([]);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState([]);
  const [abortController, setAbortController] = useState(null);

  const [sysMessage, setSysMessage] = useState(null);

  /**
   * Handle a search event by updating the search term and fetching relevant memories.
   * @async
   * @function handleSearch
   * @param {Object} event - The search event.
   */
  async function handleSearch(event) {
    setSearchTerm(event.target.value);
    const queryString = event.target.value;

    setSysMessage("Searching...");
    setMemories([]);

    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    const newAbortController = new AbortController();
    const {
      signal,
    } = newAbortController;
    setAbortController(newAbortController);

    const fetchedMemories = await aiAgentController.searchMemories(queryString, signal);
    if (signal.aborted) return;
    // console.log("fetchedMemories", fetchedMemories);
    if(fetchedMemories.length) {
      setMemories(fetchedMemories);
      setSysMessage(null);
    }
  }
  /**
   * Delete a memory with the specified ID.
   * @async
   * @function deleteMemory
   * @param {string} memoryId - The ID of the memory to delete.
   */
  async function deleteMemory(memoryId) {
    if (selectedMemoryIds.includes(memoryId)) {
      try {
        await aiAgentController.deleteMemory(memoryId);

        // Update the memories list to reflect the deleted memory
        setMemories((prevMemories) => prevMemories.filter((memory) => memory.id !== memoryId));
        setSelectedMemoryIds((prevSelectedMemoryIds) =>
          prevSelectedMemoryIds.filter((id) => id !== memoryId)
        );
      } catch (error) {
        console.error(`Failed to delete memory with ID ${memoryId}: ${error.message}`);
      }
    } else {
      setSelectedMemoryIds((prevSelectedMemoryIds) => [...prevSelectedMemoryIds, memoryId]);
    }
  }
  return (
    <>
      <input
        className={styles.searchInput}
        type="text"
        placeholder="Search memories..."
        value={searchTerm}
        onChange={(e) => handleSearch(e)}
      />
      <div className={styles.sysMessage}>
        { sysMessage }
      </div>
      <ul className={styles.chatContainer}>
        {memories.map((memory, index) => {
          const memoryData = memory.data;
          return (
            <li key={index}>
              <div className={styles.chatTimestamp}>
                <div className={styles.chatUser}>
                  {memoryData.user === "@user" ? "You" : memoryData.user}
                </div>, {new Date(memoryData.timestamp).toLocaleString()}
                <button
                  className={`${styles.deleteButton} ${
                    selectedMemoryIds.includes(memory.id) ? styles.selected : ''
                  }`}
                  onClick={() => deleteMemory(memory.id)}
                >
                  <Icon icon={"close"} iconClass={styles.icon} />
                </button>
              </div>
              <div className={classnames(styles.chatBubble, memoryData.user === "@user" ? styles.user : null)}>
              <div className={styles.chatMessage}>
                <div className={styles.chatValue}>{memoryData.value}</div>
              </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};