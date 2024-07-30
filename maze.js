
import TinyQueue from 'tinyqueue'
import { Enum } from './enum';

class MazeStats {
  constructor() {
    this.branches = 0;
    this.deadEnds = 0;
    this.dfsIterations = 0;
    this.aStarIterations = 0;
    this.path = []
  }
}


export const MazeBLockType = new Enum({
  WALL: 1,
  PATH: 0
});

class Maze {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = this.createGrid();
    this.stats = new MazeStats();
  }

  createGrid() {
    // 创建一个 width x height 的二维数组，每个单元格初始化为墙壁
    const grid = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      grid[y] = new Array(this.width).fill(MazeBLockType.WALL);
    }
    return grid;
  }

  print() {
    for (let y = 0; y < this.height; y++) {
      console.log(this.grid[y].map(cell => (cell ? ' ' : '#')).join(''));
    }
  }

  displayHtml() {
    let html = '<table style="border-collapse: collapse;">';
    for (let y = 0; y < this.height; y++) {
      html += '<tr>';
      for (let x = 0; x < this.width; x++) {
        html += `<td style="width: 10px; height: 10px; border: 1px solid black; background-color: ${this.grid[y][x] === MazeBLockType.WALL ? 'black' : this.stats.path && this.stats.path.includes(`${x},${y}`) ? 'green' : 'white'
          };"></td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    return html;
  }

  // 辅助函数：检查坐标是否在迷宫范围内
  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // 辅助函数：设置单元格为通道
  setPath(x, y) {
    if (this.inBounds(x, y)) {
      this.grid[y][x] = MazeBLockType.PATH;
    }
  }

  // 辅助函数：设置单元格为墙壁
  setWall(x, y) {
    if (this.inBounds(x, y)) {
      this.grid[y][x] = MazeBLockType.WALL;
    }
  }

  // 辅助函数：检查单元格是否是通道
  isPath(x, y) {
    return this.inBounds(x, y) && this.grid[y][x] === MazeBLockType.PATH;
  }

  // 辅助函数：检查单元格是否是墙壁
  isWall(x, y) {
    return this.inBounds(x, y) && this.grid[y][x] === MazeBLockType.WALL;
  }

  _solve(startX, startY, endX, endY) {
    const { path: dfsPath, iterations: dfsIterations, branches, deadEnds } = dfs(this, startX, startY, endX, endY);
    const { path: aStarPath, iterations: aStarIterations } = aStar(this, startX, startY, endX, endY);
    this.stats.branches = branches;
    this.stats.deadEnds = deadEnds;
    this.stats.dfsIterations = dfsIterations;
    this.stats.aStarIterations = aStarIterations;
    this.stats.path = aStarPath;
  }

  calculateScore() {
    this._solve(1, 1, this.width - 2, this.height - 2);

    const totalCells = this.width * this.height;   // 迷宫的总单元格数
    const totalIterations = totalCells * 4;  // 深度优先搜索的迭代次数是单元格数的四倍
  
    const branchesScore = (this.stats.branches / totalCells) * 100;
    const deadEndsScore = (this.stats.deadEnds / totalCells) * 100;
    const iterationsScore = (this.stats.dfsIterations + this.stats.aStarIterations) / (2 * totalIterations) * 100;
  
    // 加权求和，这里我们给路径长度、分叉和死胡同相同的权重
    return branchesScore * 0.25 + deadEndsScore * 0.25 + iterationsScore * 0.5;
  }
}


export class DFSMaze extends Maze {
  constructor(width, height) {
    super(width, height);
  }

  generate() {
    const stack = [];
    const startX = Math.floor(Math.random() * (this.width - 2) / 2) * 2 + 1;
    const startY = Math.floor(Math.random() * (this.height - 2) / 2) * 2 + 1;
    stack.push([startX, startY]);
    this.setPath(startX, startY);

    const directions = [
      [0, 2], [0, -2], [2, 0], [-2, 0]
    ];

    while (stack.length > 0) {
      const [x, y] = stack[stack.length - 1];
      const shuffledDirections = directions.sort(() => Math.random() - 0.5);
      let found = false;

      for (let [dx, dy] of shuffledDirections) {
        const nx = x + dx;
        const ny = y + dy;

        if (this.inBounds(nx, ny) && this.isWall(nx, ny)) {
          // 将当前单元格和相邻单元格之间的墙壁设置为通道
          const mx = x + dx / 2;
          const my = y + dy / 2;
          this.setPath(nx, ny);
          this.setPath(mx, my);
          stack.push([nx, ny]);
          found = true;
          break;
        }
      }

      if (!found) {
        stack.pop();
      }
    }
  }
}

export class RecursiveDivisionMaze extends Maze {
  constructor(width, height) {
    super(width, height);
  }

  initializeMaze() {
    // 设置四周为墙壁，内部为路径
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
          this.setWall(x, y);
        } else {
          this.setPath(x, y);
        }
      }
    }
  }

  generate() {
    this.initializeMaze();
    this.divide(1, 1, this.width - 2, this.height - 2);
  }

  openAdoor(x1, y1, x2, y2) {
    if (x1 === x2) {
      const pos = y1 + Math.floor(Math.random() * ((y2 - y1) / 2)) * 2;
      this.setPath(x1, pos);
    } else if (y1 === y2) {
      const pos = x1 + Math.floor(Math.random() * ((x2 - x1) / 2)) * 2;
      this.setPath(pos, y1);
    } else {
      console.log("Invalid call to openAdoor with x1 != x2 and y1 != y2");
    }
  }

  divide(x, y, height, width) {
    if (height <= 2 || width <= 2) {
      return;
    }

    // Draw a horizontal line
    const xPos = x + Math.floor(Math.random() * ((height - 1) / 2)) * 2 + 1;
    for (let i = y; i < y + width; i++) {
      this.setWall(xPos, i);
    }

    // Draw a vertical line
    const yPos = y + Math.floor(Math.random() * ((width - 1) / 2)) * 2 + 1;
    for (let i = x; i < x + height; i++) {
      this.setWall(i, yPos);
    }

    // Randomly open three doors
    const doors = [
      () => this.openAdoor(xPos + 1, yPos, x + height - 1, yPos), // 下
      () => this.openAdoor(xPos, yPos + 1, xPos, y + width - 1),  // 右
      () => this.openAdoor(x, yPos, xPos - 1, yPos),              // 上
      () => this.openAdoor(xPos, y, xPos, yPos - 1)               // 左
    ];

    // Shuffle doors array to randomize door opening sequence
    for (let i = doors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doors[i], doors[j]] = [doors[j], doors[i]];
    }

    // Open the first three doors from the shuffled array
    doors.slice(0, 3).forEach(openDoor => openDoor());

    // Recur for each quadrant
    this.divide(x, y, xPos - x, yPos - y);
    this.divide(x, yPos + 1, xPos - x, width - yPos + y - 1);
    this.divide(xPos + 1, y, height - xPos + x - 1, yPos - y);
    this.divide(xPos + 1, yPos + 1, height - xPos + x - 1, width - yPos + y - 1);
  }
}




export class KruskalMaze extends Maze {
  constructor(width, height) {
    super(width, height);
  }

  generate() {
    const walls = [];
    const sets = new Map();
    let nextSet = 0;

    for (let y = 1; y < this.height - 1; y += 2) {
      for (let x = 1; x < this.width - 1; x += 2) {
        this.setPath(x, y);  // 初始化网格
        sets.set(`${x},${y}`, nextSet++); // 每个单元格都是一个集合
        if (x < this.width - 2) {
          walls.push([[x, y], [x + 2, y]]);  // 一墙之隔的右侧单元格
        }
        if (y < this.height - 2) {
          walls.push([[x, y], [x, y + 2]]);  // 一墙之隔的下侧单元格
        }
      }
    }

    walls.sort(() => Math.random() - 0.5);

    for (const [[x1, y1], [x2, y2]] of walls) {
      const set1 = sets.get(`${x1},${y1}`);
      const set2 = sets.get(`${x2},${y2}`);

      if (set1 !== set2) {
        // 如果两个单元格不属于同一个集合，则打开墙壁
        this.setPath((x1 + x2) / 2, (y1 + y2) / 2);

        // 将两个集合合并
        for (const [key, value] of sets.entries()) {
          if (value === set2) {
            sets.set(key, set1);
          }
        }
      }
    }
  }
}


export class PrimMaze extends Maze {
  constructor(width, height) {
    super(width, height);
  }

  generate() {
    const frontierWalls = [];
    const visited = new Array(this.height).fill().map(() => new Array(this.width).fill(false));

    // 随机选择一个初始点并标记为已访问
    const startX = 2 * Math.floor(Math.random() * Math.floor((this.width - 1) / 2)) + 1;
    const startY = 2 * Math.floor(Math.random() * Math.floor((this.height - 1) / 2)) + 1;
    this.setPath(startX, startY);
    visited[startY][startX] = true;

    // 将起始点周围的墙加入到 frontierWalls
    this.addFrontierWalls(startX, startY, frontierWalls, visited);

    while (frontierWalls.length > 0) {
      const wallIndex = Math.floor(Math.random() * frontierWalls.length);
      const wall = frontierWalls.splice(wallIndex, 1)[0];
      const [nx, ny] = [wall.nx, wall.ny];

      if (!visited[ny][nx]) {
        // 打开墙，并将新单元标记为路径
        this.setPath(wall.mx, wall.my);
        this.setPath(nx, ny);
        visited[ny][nx] = true;

        // 将新单元的墙加入前沿墙列表
        this.addFrontierWalls(nx, ny, frontierWalls, visited);
      }
    }
  }

  addFrontierWalls(x, y, frontierWalls, visited) {
    const directions = [[0, 2], [0, -2], [2, 0], [-2, 0]]; // 只检查每个方向上的第二个单元（通过墙）
    directions.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      const mx = x + dx / 2;
      const my = y + dy / 2;
      if (this.inBounds(nx, ny) && !visited[ny][nx]) {
        // mx, my 是墙的坐标, nx, ny 是新单元的坐标
        frontierWalls.push({ mx, my, nx, ny })
      }
    });
  }
}

function aStar(maze, startX, startY, endX, endY) {
  const heuristic = (x, y, endX, endY) => {
    // 使用曼哈顿距离作为启发式函数
    return Math.abs(x - endX) + Math.abs(y - endY);
  }
  
  const reconstructPath = (cameFrom, x, y) => {
    let path = [];
    let current = `${x},${y}`;
    while (cameFrom.has(current)) {
      path.push(current);
      const prev = cameFrom.get(current);
      current = `${prev.x},${prev.y}`;
    }
    path.push(current);
    return path.reverse();
  }

  const containsInOpenSet = (openSet, x, y) => {
    return openSet.data.some(item => item.x === x && item.y === y);
  }

  let iterations = 0;
  const openSet = new TinyQueue([], (a, b) => a.f - b.f);  // 优先队列, 按 f 值排序
  const cameFrom = new Map();
  const gScore = new Map();  // 从起点到当前单元格的实际代价
  const fScore = new Map();  // gScore + 启发式函数的估计代价
  const startKey = `${startX},${startY}`;
  const endKey = `${endX},${endY}`;

  openSet.push({ x: startX, y: startY, f: heuristic(startX, startY, endX, endY) });
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(startX, startY, endX, endY));

  while (openSet.length > 0) {
    ++iterations;
    const current = openSet.pop();
    const currentKey = `${current.x},${current.y}`;

    if (currentKey === endKey) {
      return { path: reconstructPath(cameFrom, current.x, current.y), iterations };
    }

    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    directions.forEach(([dx, dy]) => {
      const neighborX = current.x + dx;
      const neighborY = current.y + dy;
      const neighborKey = `${neighborX},${neighborY}`;

      if (maze.inBounds(neighborX, neighborY) && maze.isPath(neighborX, neighborY)) {
        const tentativeGScore = gScore.get(currentKey) + 1;  // 从起点到邻居的实际代价
        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {  // 如果新路径更短
          cameFrom.set(neighborKey, { x: current.x, y: current.y });  // 更新路径
          gScore.set(neighborKey, tentativeGScore);  // 更新实际代价
          const f = tentativeGScore + heuristic(neighborX, neighborY, endX, endY);
          fScore.set(neighborKey, f);  // 更新估计代价
          if (!containsInOpenSet(openSet, neighborX, neighborY)) {
            openSet.push({ x: neighborX, y: neighborY, f });
          }
        }
      }
    });
  }

  return {
    path: null,
    iterations
  };  // 未找到路径
}


function dfs(maze, x, y, endX, endY) {
  const stack = [{ x, y, path: [`${x},${y}`] }];
  let branches = 0;
  let deadEnds = 0;
  const visited = {};
  let iterations = 0;
  visited[`${x},${y}`] = true;

  while (stack.length > 0) {
    const { x: cx, y: cy, path } = stack.pop();
    iterations++;

    // 如果到达终点，则返回当前的路径和迭代次数
    if (cx === endX && cy === endY) {
      return { path, iterations, branches, deadEnds };
    }

    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
    let paths = 0

    for (let [dx, dy] of directions) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (maze.inBounds(nx, ny) && maze.isPath(nx, ny) && !visited[`${nx},${ny}`]) {
        paths++;
        visited[`${nx},${ny}`] = true;
        stack.push({ x: nx, y: ny, path: path.concat([`${nx},${ny}`]) });
      }
    }

    if (paths > 1) {
      branches += paths - 1;
    }
    if (paths === 0) {
      deadEnds++;
    }
  }

  // 如果堆栈耗尽仍未找到路径，返回空路径和迭代次数
  return { path: [], iterations, branches, deadEnds };
}