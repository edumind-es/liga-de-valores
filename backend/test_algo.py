#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#


def generate_round_robin_matches(equipos, jornada_num):
    """
    Generates matches for a specific round using Berger algorithm (Circle method).
    """
    n = len(equipos)
    if n % 2 == 1:
        equipos = equipos + [None] # Dummy team for odd number
        n += 1
        
    # Valid matches for this round
    matches = []
    
    # List of teams excluding the fixed one (first one)
    rotating = equipos[1:]
    num_rotating = len(rotating)
    
    # Calculate offset based on jornada_num (1-indexed)
    round_idx = (jornada_num - 1) % (n - 1)
    
    # Rotate the list
    # Python slicing: [n:] + [:n] rotates left by n
    # We want to shift so that diverse matchups happen
    rotated = rotating[round_idx:] + rotating[:round_idx]
    
    # Reconstruct full list with fixed team at start
    full_list = [equipos[0]] + rotated
    
    # Pair teams
    # 0 vs last, 1 vs last-1, etc.
    for i in range(n // 2):
        team_a = full_list[i]
        team_b = full_list[n - 1 - i]
        
        if team_a is None or team_b is None:
            continue # Bye (descanso)
            
        # Alternate home/away based on round number to balance
        if round_idx % 2 == 1:
             matches.append((team_a, team_b))
        else:
             matches.append((team_b, team_a))
             
    return matches

# Test
equipos = list(range(1, 7)) # 6 teams
print(f"Teams: {equipos}")
for j in range(1, 6):
    matches = generate_round_robin_matches(equipos, j)
    print(f"Jornada {j}: {matches}")
    
equipos10 = list(range(1, 11))
print(f"\nTeams 10:")
matches10 = generate_round_robin_matches(equipos10, 1)
print(f"Jornada 1: {matches10} (Count: {len(matches10)})")
