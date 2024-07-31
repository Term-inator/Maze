import { MazeBLockType, DFSMaze, RecursiveDivisionMaze, PrimMaze, KruskalMaze } from "./maze";
import { Enum } from "./enum";


export const GameBlockType = new Enum({
  WALL: MazeBLockType.WALL,
  PATH: MazeBLockType.PATH,
  LEMON: 2,
  TREE: 3,
  START: 4,
});


export class Game {
  constructor() {
    this.load()
    this.init()
  }

  load() {
    this.level = 4
  }

  init() {
    this.mazeSize = 11
    this.maze = new KruskalMaze(this.mazeSize, this.mazeSize)
    
    this.maze.generate()

    this.roomSize = 7
    this.roomRange = [[(this.mazeSize - this.roomSize) / 2, (this.mazeSize + this.roomSize) / 2], [(this.mazeSize - this.roomSize) / 2, (this.mazeSize + this.roomSize) / 2]]
    for (let x = this.roomRange[0][0]; x < this.roomRange[0][1]; x++) {
      for (let y = this.roomRange[1][0]; y < this.roomRange[1][1]; y++) {
        this.maze.setPath(x, y)
      }
    }
    this.maze.calculateScore()

    // 中心点
    this.tree = [Math.floor(this.mazeSize / 2), Math.floor(this.mazeSize / 2)]
    this.start = [Math.floor(this.mazeSize / 2), Math.floor(this.mazeSize / 2) + 2]
    this.maze.grid[this.start[1]][this.start[0]] = GameBlockType.START
    this.maze.grid[this.tree[1]][this.tree[0]] = GameBlockType.TREE

    this.setLemon()

    // const html = this.displayHtml()
    // document.body.innerHTML = html
  }

  displayHtml() {
    const colors = {
      [MazeBLockType.WALL]: 'black',
      [MazeBLockType.PATH]: 'white',
      [GameBlockType.LEMON]: 'yellow',
      [GameBlockType.TREE]: 'green',
      [GameBlockType.START]: 'red',
    }
    let html = '<table style="border-collapse: collapse;">';
    for (let y = 0; y < this.maze.height; y++) {
      html += '<tr>';
      for (let x = 0; x < this.maze.width; x++) {
        html += `<td style="width: 10px; height: 10px; border: 1px solid black; background-color: ${ colors[this.maze.grid[y][x]] }"></td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    return html;
  }

  setLemon() {
    const points = []
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];  // 可以向上、下、左、右移动
    const queue = [[this.tree[0], this.tree[1], 0]];  // 队列中的元素包括当前位置和当前路径长度
    const visited = new Set(`${this.tree[0]},${this.tree[1]}`);  // 使用集合来跟踪已访问的位置
    let maxDist = 0

    while (queue.length > 0) {
        const [x, y, dist] = queue.shift();

        points.push([x, y, dist])
        maxDist = Math.max(maxDist, dist)

        // 遍历所有可能的移动方向
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            // 检查新位置是否在边界内且未被访问过
            if (this.maze.inBounds(nx, ny) && !visited.has(`${nx},${ny}`) && !this.maze.isWall(nx, ny)) {
                visited.add(`${nx},${ny}`);
                queue.push([nx, ny, dist + 1]);
            }
        }
    }
    const d = Math.floor(maxDist)
    const pointsDistance = points.filter(point => point[2] === d)
    this.lemon = pointsDistance[Math.floor(Math.random() * pointsDistance.length)]
    this.maze.grid[this.lemon[0]][this.lemon[1]] = GameBlockType.LEMON
  }
}